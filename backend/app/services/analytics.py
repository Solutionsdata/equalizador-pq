import statistics
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.models.pq_item import PQItem
from app.models.proposal import Proposal
from app.models.proposal_item import ProposalItem
from app.schemas.analytics import (
    ABCItem, ParetoData, ProposalComparisonItem,
    EqualizationResponse, EqualizationProposal,
    DisciplineSummary, CategoriaSummary, LocalidadeSummary,
)


def _dec(v: float) -> Decimal:
    return Decimal(str(round(v, 4)))


class AnalyticsService:

    @staticmethod
    def get_pareto(db: Session, project_id: int, source: str = "referencia", revision_id: int | None = None) -> ParetoData:
        pq_q = db.query(PQItem).filter(PQItem.project_id == project_id)
        if revision_id is not None:
            pq_q = pq_q.filter(PQItem.revision_id == revision_id)
        pq_items = pq_q.order_by(PQItem.ordem, PQItem.numero_item).all()

        # Batch-load all proposal prices upfront (avoids N+1)
        pi_by_pq_id: dict[int, list[float]] = {}
        if source == "propostas":
            pq_ids = [item.id for item in pq_items]
            if pq_ids:
                for pi in db.query(ProposalItem).filter(ProposalItem.pq_item_id.in_(pq_ids)).all():
                    price = pi.custo_unit_com_reidi or pi.preco_unitario
                    if price:
                        pi_by_pq_id.setdefault(pi.pq_item_id, []).append(float(price))

        raw: list[dict] = []
        for item in pq_items:
            if source == "referencia":
                if item.preco_referencia and item.quantidade:
                    valor = float(item.quantidade) * float(item.preco_referencia)
                    raw.append({"item": item, "preco_medio": float(item.preco_referencia), "valor": valor})
            else:
                prices = pi_by_pq_id.get(item.id, [])
                if prices and item.quantidade:
                    pm = sum(prices) / len(prices)
                    raw.append({"item": item, "preco_medio": pm, "valor": float(item.quantidade) * pm})

        raw.sort(key=lambda x: x["valor"], reverse=True)
        total = sum(r["valor"] for r in raw)
        cumulative = 0.0

        abc_items: list[ABCItem] = []
        counters = {"A": 0, "B": 0, "C": 0}
        valores = {"A": 0.0, "B": 0.0, "C": 0.0}

        for i, r in enumerate(raw):
            cumulative += r["valor"]
            pct = r["valor"] / total * 100 if total else 0
            pct_acum = cumulative / total * 100 if total else 0

            if pct_acum <= 80:
                classe = "A"
            elif pct_acum <= 95:
                classe = "B"
            else:
                classe = "C"

            counters[classe] += 1
            valores[classe] += r["valor"]

            desc = r["item"].descricao
            abc_items.append(ABCItem(
                pq_item_id=r["item"].id,
                numero_item=r["item"].numero_item,
                descricao=desc[:60] + "…" if len(desc) > 60 else desc,
                unidade=r["item"].unidade,
                quantidade=r["item"].quantidade,
                categoria=r["item"].categoria,
                disciplina=r["item"].disciplina,
                localidade=r["item"].localidade,
                preco_medio=_dec(r["preco_medio"]),
                valor_total=_dec(r["valor"]),
                percentual=round(pct, 2),
                percentual_acumulado=round(pct_acum, 2),
                classe=classe,
                posicao=i + 1,
            ))

        return ParetoData(
            items=abc_items,
            total_valor=_dec(total),
            count_a=counters["A"], count_b=counters["B"], count_c=counters["C"],
            valor_a=_dec(valores["A"]), valor_b=_dec(valores["B"]), valor_c=_dec(valores["C"]),
        )

    @staticmethod
    def get_equalization(db: Session, project_id: int, revision_id: int | None = None) -> EqualizationResponse:
        pq_q = db.query(PQItem).filter(PQItem.project_id == project_id)
        if revision_id is not None:
            pq_q = pq_q.filter(PQItem.revision_id == revision_id)
        pq_items = pq_q.order_by(PQItem.ordem, PQItem.numero_item).all()

        prop_q = db.query(Proposal).filter(Proposal.project_id == project_id)
        if revision_id is not None:
            prop_q = prop_q.filter(Proposal.revision_id == revision_id)
        proposals = prop_q.all()

        # Batch-load ALL ProposalItems in one query (eliminates N×M queries)
        proposal_ids = [p.id for p in proposals]
        pq_item_ids = [item.id for item in pq_items]
        pi_map: dict[tuple[int, int], ProposalItem] = {}
        if proposal_ids and pq_item_ids:
            for pi in (
                db.query(ProposalItem)
                .filter(
                    ProposalItem.proposal_id.in_(proposal_ids),
                    ProposalItem.pq_item_id.in_(pq_item_ids),
                )
                .all()
            ):
                pi_map[(pi.proposal_id, pi.pq_item_id)] = pi

        prop_totals = {p.id: 0.0 for p in proposals}
        comparison: list[ProposalComparisonItem] = []

        for item in pq_items:
            precos: dict[str, float | None] = {}
            totais: dict[str, float | None] = {}
            prices_list: list[float] = []

            for p in proposals:
                pi = pi_map.get((p.id, item.id))
                # Use COM REIDI price for analytics; fall back to sem REIDI for old data
                com_price = pi.custo_unit_com_reidi if pi else None
                sem_price = pi.preco_unitario if pi else None
                pu_raw = com_price or sem_price
                if pi and pu_raw:
                    pu = float(pu_raw)
                    bdi_val = pi.bdi_com_reidi if com_price else pi.bdi
                    # Individual BDI stored as fraction (0.43 = 43%); global BDI stored as percentage (43 = 43%)
                    if bdi_val is not None:
                        bdi_factor = 1 + float(bdi_val)
                    else:
                        bdi_factor = 1 + float(p.bdi_global or 0) / 100
                    total = float(item.quantidade) * pu * bdi_factor
                    precos[str(p.id)] = pu
                    totais[str(p.id)] = round(total, 2)
                    prices_list.append(pu)
                    prop_totals[p.id] += total
                else:
                    precos[str(p.id)] = None
                    totais[str(p.id)] = None

            val_ref = (
                float(item.quantidade) * float(item.preco_referencia)
                if item.preco_referencia and item.quantidade
                else None
            )

            comparison.append(ProposalComparisonItem(
                pq_item_id=item.id,
                numero_item=item.numero_item,
                descricao=item.descricao,
                unidade=item.unidade,
                quantidade=item.quantidade,
                categoria=item.categoria,
                disciplina=item.disciplina,
                localidade=item.localidade,
                preco_referencia=item.preco_referencia,
                valor_referencia=_dec(val_ref) if val_ref else None,
                precos=precos,
                totais=totais,
                preco_medio=_dec(statistics.mean(prices_list)) if prices_list else None,
                preco_minimo=_dec(min(prices_list)) if prices_list else None,
                preco_maximo=_dec(max(prices_list)) if prices_list else None,
                desvio_padrao=round(statistics.stdev(prices_list), 4) if len(prices_list) > 1 else None,
            ))

        proposal_list = [
            EqualizationProposal(
                id=p.id,
                empresa=p.empresa,
                status=p.status.value,
                is_winner=p.is_winner,
                bdi_global=float(p.bdi_global),
                valor_total=round(prop_totals[p.id], 2),
            )
            for p in proposals
        ]

        return EqualizationResponse(
            project_id=project_id,
            proposals=proposal_list,
            items=comparison,
        )

    @staticmethod
    def _avg_proposal_prices(db: Session, project_id: int, revision_id: int | None, pq_item_ids: list[int]) -> dict[int, float]:
        """Returns average proposal unit price (COM REIDI or SEM REIDI) per PQ item id."""
        if not pq_item_ids:
            return {}
        prop_q = db.query(Proposal).filter(Proposal.project_id == project_id)
        if revision_id is not None:
            prop_q = prop_q.filter(Proposal.revision_id == revision_id)
        prop_ids = [p.id for p in prop_q.with_entities(Proposal.id).all()]
        if not prop_ids:
            return {}

        avg_prices: dict[int, float] = {}
        pi_rows = (
            db.query(ProposalItem)
            .filter(
                ProposalItem.proposal_id.in_(prop_ids),
                ProposalItem.pq_item_id.in_(pq_item_ids),
            )
            .all()
        )
        buckets: dict[int, list[float]] = {}
        for pi in pi_rows:
            price = float(pi.custo_unit_com_reidi or pi.preco_unitario or 0)
            if price > 0:
                buckets.setdefault(pi.pq_item_id, []).append(price)
        for pq_id, prices in buckets.items():
            avg_prices[pq_id] = sum(prices) / len(prices)
        return avg_prices

    @staticmethod
    def get_discipline_summary(db: Session, project_id: int, revision_id: int | None = None) -> List[DisciplineSummary]:
        q = db.query(PQItem).filter(PQItem.project_id == project_id)
        if revision_id is not None:
            q = q.filter(PQItem.revision_id == revision_id)
        items = q.all()
        avg_prices = AnalyticsService._avg_proposal_prices(db, project_id, revision_id, [i.id for i in items])
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        grand = 0.0

        for item in items:
            key = item.disciplina or "Sem Disciplina"
            totals.setdefault(key, 0.0)
            counts.setdefault(key, 0)
            unit_price = avg_prices.get(item.id) or (float(item.preco_referencia) if item.preco_referencia else None)
            if unit_price and item.quantidade:
                v = float(item.quantidade) * unit_price
                totals[key] += v
                grand += v
            counts[key] += 1

        return [
            DisciplineSummary(
                disciplina=k, valor_total=_dec(v),
                percentual=round(v / grand * 100, 2) if grand else 0,
                count_items=counts[k],
            )
            for k, v in sorted(totals.items(), key=lambda x: x[1], reverse=True)
        ]

    @staticmethod
    def get_categoria_summary(db: Session, project_id: int, revision_id: int | None = None) -> List[CategoriaSummary]:
        q = db.query(PQItem).filter(PQItem.project_id == project_id)
        if revision_id is not None:
            q = q.filter(PQItem.revision_id == revision_id)
        items = q.all()
        avg_prices = AnalyticsService._avg_proposal_prices(db, project_id, revision_id, [i.id for i in items])
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        grand = 0.0

        for item in items:
            key = item.categoria or "Sem Categoria"
            totals.setdefault(key, 0.0)
            counts.setdefault(key, 0)
            unit_price = avg_prices.get(item.id) or (float(item.preco_referencia) if item.preco_referencia else None)
            if unit_price and item.quantidade:
                v = float(item.quantidade) * unit_price
                totals[key] += v
                grand += v
            counts[key] += 1

        return [
            CategoriaSummary(
                categoria=k, valor_total=_dec(v),
                percentual=round(v / grand * 100, 2) if grand else 0,
                count_items=counts[k],
            )
            for k, v in sorted(totals.items(), key=lambda x: x[1], reverse=True)
        ]

    @staticmethod
    def get_localidade_summary(db: Session, project_id: int, revision_id: int | None = None) -> List[LocalidadeSummary]:
        q = db.query(PQItem).filter(PQItem.project_id == project_id)
        if revision_id is not None:
            q = q.filter(PQItem.revision_id == revision_id)
        items = q.all()
        avg_prices = AnalyticsService._avg_proposal_prices(db, project_id, revision_id, [i.id for i in items])
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        grand = 0.0

        for item in items:
            key = item.localidade or "Sem Localidade"
            totals.setdefault(key, 0.0)
            counts.setdefault(key, 0)
            unit_price = avg_prices.get(item.id) or (float(item.preco_referencia) if item.preco_referencia else None)
            if unit_price and item.quantidade:
                v = float(item.quantidade) * unit_price
                totals[key] += v
                grand += v
            counts[key] += 1

        return [
            LocalidadeSummary(
                localidade=k, valor_total=_dec(v),
                percentual=round(v / grand * 100, 2) if grand else 0,
                count_items=counts[k],
            )
            for k, v in sorted(totals.items(), key=lambda x: x[1], reverse=True)
        ]
