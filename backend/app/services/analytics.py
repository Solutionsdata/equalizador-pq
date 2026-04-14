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
    DisciplineSummary, CategoriaSummary,
)


def _dec(v: float) -> Decimal:
    return Decimal(str(round(v, 4)))


class AnalyticsService:

    @staticmethod
    def get_pareto(db: Session, project_id: int, source: str = "referencia") -> ParetoData:
        """
        Curva ABC / Pareto dos itens da PQ.
        source = 'referencia' usa preco_referencia; 'propostas' usa média dos preços ofertados.
        """
        pq_items = (
            db.query(PQItem)
            .filter(PQItem.project_id == project_id)
            .order_by(PQItem.ordem, PQItem.numero_item)
            .all()
        )

        raw: list[dict] = []
        for item in pq_items:
            if source == "referencia":
                if item.preco_referencia and item.quantidade:
                    valor = float(item.quantidade) * float(item.preco_referencia)
                    raw.append({"item": item, "preco_medio": float(item.preco_referencia), "valor": valor})
            else:
                prop_items = db.query(ProposalItem).filter(ProposalItem.pq_item_id == item.id).all()
                prices = [float(pi.preco_unitario) for pi in prop_items if pi.preco_unitario]
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
    def get_equalization(db: Session, project_id: int) -> EqualizationResponse:
        """Tabela de equalização — todas as propostas lado a lado."""
        pq_items = (
            db.query(PQItem)
            .filter(PQItem.project_id == project_id)
            .order_by(PQItem.ordem, PQItem.numero_item)
            .all()
        )
        proposals = db.query(Proposal).filter(Proposal.project_id == project_id).all()

        prop_totals = {p.id: 0.0 for p in proposals}
        comparison: list[ProposalComparisonItem] = []

        for item in pq_items:
            precos: dict[str, float | None] = {}
            totais: dict[str, float | None] = {}
            prices_list: list[float] = []

            for p in proposals:
                pi = (
                    db.query(ProposalItem)
                    .filter(ProposalItem.proposal_id == p.id, ProposalItem.pq_item_id == item.id)
                    .first()
                )
                if pi and pi.preco_unitario:
                    pu = float(pi.preco_unitario)
                    bdi = float(pi.bdi if pi.bdi is not None else p.bdi_global or 0)
                    total = float(item.quantidade) * pu * (1 + bdi / 100)
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
    def get_discipline_summary(db: Session, project_id: int) -> List[DisciplineSummary]:
        items = db.query(PQItem).filter(PQItem.project_id == project_id).all()
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        grand = 0.0

        for item in items:
            key = item.disciplina or "Sem Disciplina"
            totals.setdefault(key, 0.0)
            counts.setdefault(key, 0)
            if item.preco_referencia and item.quantidade:
                v = float(item.quantidade) * float(item.preco_referencia)
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
    def get_categoria_summary(db: Session, project_id: int) -> List[CategoriaSummary]:
        items = db.query(PQItem).filter(PQItem.project_id == project_id).all()
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        grand = 0.0

        for item in items:
            key = item.categoria or "Sem Categoria"
            totals.setdefault(key, 0.0)
            counts.setdefault(key, 0)
            if item.preco_referencia and item.quantidade:
                v = float(item.quantidade) * float(item.preco_referencia)
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
