from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import desc, func, cast, String
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from app.database import get_db
from app.models import Transaction, Category, User, TransactionType, CreditCard, Account, Tag, Investment, AnnualExpense
from app.schemas import (
    TransactionCreate, TransactionResponse, TransactionSummary,
    CategoryResponse, CategoryCreate, CategoryUpdate, CreditCardResponse, AccountResponse,
    NetWorthResponse, BalanceProjectionResponse, TagResponse
)
from app.routes.auth import get_current_user_id
import uuid

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # Validação de limite de cartão de crédito (Requisito 9)
    if data.type == TransactionType.expense and data.payment_method == "credito" and data.credit_card_id:
        card = db.query(CreditCard).filter(CreditCard.id == data.credit_card_id, CreditCard.user_id == user_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Cartão de crédito não encontrado.")
        
        # Calcular o débito acumulado do cartão (despesas não pagas)
        card_debt = db.query(func.sum(Transaction.value)).filter(
            Transaction.user_id == user_id,
            Transaction.credit_card_id == data.credit_card_id,
            Transaction.is_paid == False
        ).scalar() or 0.0
        
        available_limit = card.limit - card_debt
        if data.value > available_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Limite do cartão de crédito excedido. Limite disponível: R$ {available_limit:.2f}. Valor da transação: R$ {data.value:.2f}"
            )

    # Validação para transações fixas
    if data.is_fixed:
        if not data.day_of_month or data.day_of_month < 1 or data.day_of_month > 31:
            raise HTTPException(status_code=400, detail="Dia do mês inválido. Deve estar entre 1 e 31 para transações fixas.")
        
        now = datetime.utcnow()
        is_paid = data.is_paid if data.day_of_month <= now.day else False
    else:
        is_paid = data.is_paid

    # Lógica de Parcelamento (US-11)
    if data.installments_total and data.installments_total > 1:
        group_id = str(uuid.uuid4())
        installment_value = data.value / data.installments_total
        base_date = data.date or datetime.utcnow()
        first_transaction = None

        for i in range(1, data.installments_total + 1):
            year = base_date.year + (base_date.month + i - 2) // 12
            month = (base_date.month + i - 2) % 12 + 1
            day = min(base_date.day, 28) # Evita erros em meses curtos
            current_date = datetime(year, month, day)

            new_t = Transaction(
                user_id=user_id,
                category_id=data.category_id,
                credit_card_id=data.credit_card_id,
                account_id=data.account_id,
                type=data.type,
                value=installment_value,
                description=f"{data.description} ({i}/{data.installments_total})" if data.description else f"Parcela {i}/{data.installments_total}",
                date=current_date,
                is_paid=is_paid if i == 1 else False,
                is_fixed=False,
                payment_method=data.payment_method,
                installments_total=data.installments_total,
                installment_number=i,
                installment_group=group_id,
                latitude=data.latitude,
                longitude=data.longitude,
                location_address=data.location_address,
                contact_name=data.contact_name
            )
            if data.tag_ids:
                tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids), Tag.user_id == user_id).all()
                new_t.tags = tags
            db.add(new_t)
            if i == 1:
                first_transaction = new_t
        
        db.commit()
        db.refresh(first_transaction)
        return first_transaction

    # Caso comum (sem parcelamento)
    new_transaction = Transaction(
        user_id=user_id,
        category_id=data.category_id,
        credit_card_id=data.credit_card_id,
        account_id=data.account_id,
        type=data.type,
        value=data.value,
        description=data.description,
        date=data.date or datetime.utcnow(),
        is_paid=is_paid,
        is_fixed=data.is_fixed,
        day_of_month=data.day_of_month,
        payment_method=data.payment_method,
        installments_total=1,
        installment_number=1,
        latitude=data.latitude,
        longitude=data.longitude,
        location_address=data.location_address,
        contact_name=data.contact_name
    )
    if data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids), Tag.user_id == user_id).all()
        new_transaction.tags = tags
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    type: Optional[str] = Query(None),
    days: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("date"),
    sort_order: Optional[str] = Query("asc"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Lista transações do usuário com filtros avançados"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)

    if type and type != 'all':
        query = query.filter(func.lower(cast(Transaction.type, String)).contains(type.lower()))

    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method)

    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    if days and not start_date:
        from datetime import timedelta
        date_limit = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Transaction.date >= date_limit)

    if sort_by in ["date", "value"] and sort_order in ["asc", "desc"]:
        sort_column = getattr(Transaction, sort_by)
        query = query.order_by(sort_column.asc() if sort_order == "asc" else sort_column.desc())

    return query.all()

@router.get("/summary", response_model=TransactionSummary)
def get_summary(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Dados resumidos para o Dashboard com filtro de mês"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, String
    now = datetime.utcnow()
    
    # Se não informar, usa o mês atual
    if month is None: month = now.month
    if year is None: year = now.year
    
    # Filtro de data para o banco
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # Buscar apenas transações do período
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).all()
    
    # Normalizar "now" para garantir comparação sem fuso horário se necessário
    now_naive = now.replace(tzinfo=None)
    current_day = now_naive.day
    
    # Saldo Disponível (acumulado total)
    all_transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    
    def is_effectively_paid(t, compare_date):
        # Data da transação (sem fuso horário)
        t_date = t.date.replace(tzinfo=None) if hasattr(t.date, 'tzinfo') else t.date
        
        # 1. Se já foi marcado como pago manualmente, sempre conta
        if t.is_paid:
            return True
            
        # 2. Se é uma transação fixa, verificamos o dia do mês
        if t.is_fixed and t.day_of_month:
            # Se estamos no mês da transação fixa e o dia já passou
            if t_date.month == compare_date.month and t_date.year == compare_date.year:
                return t.day_of_month <= current_day
            # Se a transação fixa é de um mês passado, conta como paga
            if t_date < compare_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0):
                return True
        
        # 3. Para transações normais: se a data chegou ou passou, conta como automático
        return t_date.date() <= compare_date.date()

    paid_income_total = sum(t.value for t in all_transactions if t.type == TransactionType.income and is_effectively_paid(t, now_naive))
    paid_expense_total = sum(t.value for t in all_transactions if t.type == TransactionType.expense and is_effectively_paid(t, now_naive))
    balance = paid_income_total - paid_expense_total
    
    # Pendentes (Não pago E não é automático)
    pending_income_list = [
        {"id": t.id, "description": t.description, "value": float(t.value), "date": t.date.isoformat()}
        for t in transactions if t.type == TransactionType.income and not is_effectively_paid(t, now_naive)
    ]
    pending_expense_list = [
        {"id": t.id, "description": t.description, "value": float(t.value), "date": t.date.isoformat()}
        for t in transactions if t.type == TransactionType.expense and not is_effectively_paid(t, now_naive)
    ]
    
    pending_income = sum(item["value"] for item in pending_income_list)
    pending_expense = sum(item["value"] for item in pending_expense_list)

    # Totais do Mês Atual (apenas transações efetivamente recebidas/pagas)
    total_income_month = sum(t.value for t in transactions if t.type == TransactionType.income and is_effectively_paid(t, now_naive))
    total_expense_month = sum(t.value for t in transactions if t.type == TransactionType.expense and is_effectively_paid(t, now_naive))
    
    # Agrupar categorias APENAS para transações efetivamente pagas/recebidas
    # Gastos
    categories_expense_dict = {}
    for t in transactions:
        if t.type == TransactionType.expense and is_effectively_paid(t, now_naive):
            if t.category:
                cat_key = (t.category.id, t.category.name, t.category.icon, t.category.color, t.category.is_default, t.category.budget_limit)
                if cat_key not in categories_expense_dict:
                    categories_expense_dict[cat_key] = 0
                categories_expense_dict[cat_key] += t.value
    
    categories_expense = [
        {"id": k[0], "name": k[1], "icon": k[2], "color": k[3], "isDefault": k[4], "budget_limit": k[5], "value": v}
        for k, v in categories_expense_dict.items()
    ]
    
    # Receitas
    categories_income_dict = {}
    for t in transactions:
        if t.type == TransactionType.income and is_effectively_paid(t, now_naive):
            if t.category:
                cat_key = (t.category.id, t.category.name, t.category.icon, t.category.color, t.category.is_default, t.category.budget_limit)
                if cat_key not in categories_income_dict:
                    categories_income_dict[cat_key] = 0
                categories_income_dict[cat_key] += t.value
    
    categories_income = [
        {"id": k[0], "name": k[1], "icon": k[2], "color": k[3], "isDefault": k[4], "budget_limit": k[5], "value": v}
        for k, v in categories_income_dict.items()
    ]
    
    by_category_expense = [
        {
            "id": c["id"], "name": c["name"], "icon": c["icon"], "color": c["color"], "value": c["value"], 
            "isDefault": c["isDefault"], "budget_limit": c["budget_limit"],
            "percentage": round((c["value"]/total_expense_month*100),1) if total_expense_month > 0 else 0
        } for c in categories_expense
    ]

    by_category_income = [
        {
            "id": c["id"], "name": c["name"], "icon": c["icon"], "color": c["color"], "value": c["value"], 
            "isDefault": c["isDefault"], "budget_limit": c["budget_limit"],
            "percentage": round((c["value"]/total_income_month*100),1) if total_income_month > 0 else 0
        } for c in categories_income
    ]

    # Evolução do Saldo (últimos 6 meses)
    balance_evolution = []
    # Usamos o mês informado como referência final
    for i in range(5, -1, -1):
        # Mês e ano alvo
        target_month = month - i
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        # Filtro de data para esse mês específico
        evol_start_date = datetime(target_year, target_month, 1)
        if target_month == 12:
            evol_end_date = datetime(target_year + 1, 1, 1)
        else:
            evol_end_date = datetime(target_year, target_month + 1, 1)
            
        # Todas as transações ATÉ o fim desse mês alvo para calcular o saldo acumulado
        accumulated_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date < evol_end_date
        ).all()
        
        # Para o saldo histórico, consideramos o que estaria pago até o fim daquele mês
        # Usamos uma data de referência do fim do mês alvo
        ref_date = evol_end_date - timedelta(seconds=1)
        
        acc_income = sum(t.value for t in accumulated_transactions if t.type == TransactionType.income and (t.is_paid or (t.is_fixed and t.day_of_month and t.day_of_month <= 31))) # Simplificado para histórico
        acc_expense = sum(t.value for t in accumulated_transactions if t.type == TransactionType.expense and (t.is_paid or (t.is_fixed and t.day_of_month and t.day_of_month <= 31)))
        
        month_label = evol_start_date.toLocaleString('pt-BR', { month: 'short' }) if hasattr(evol_start_date, 'toLocaleString') else evol_start_date.strftime("%b")
        # Nomes curtos em PT-BR manuais para evitar problemas de locale no servidor
        months_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        month_label = months_pt[target_month - 1]

        balance_evolution.append({
            "month": month_label,
            "balance": float(acc_income - acc_expense)
        })

    print(f"DEBUG: Consultando Dashboard para User {user_id} em {month}/{year}")
    
    # --- BALANÇO POR CONTA (US-12) ---
    from app.models import Account
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    accounts_summary = []
    for acc in accounts:
        # Buscar todas as transações vinculadas a esta conta
        acc_transactions = db.query(Transaction).filter(Transaction.account_id == acc.id).all()
        
        # Calcular entradas e saídas usando a mesma lógica de "efetivamente pago/recebido"
        acc_income = sum(t.value for t in acc_transactions if t.type == TransactionType.income and is_effectively_paid(t, now_naive))
        acc_expense = sum(t.value for t in acc_transactions if t.type == TransactionType.expense and is_effectively_paid(t, now_naive))
        
        current_bal = acc.initial_balance + acc_income - acc_expense
        
        accounts_summary.append({
            "id": acc.id,
            "name": acc.name,
            "type": acc.type,
            "initial_balance": acc.initial_balance,
            "user_id": user_id,
            "current_balance": current_bal
        })

    print(f"DEBUG: Consultando Dashboard para User {user_id} em {month}/{year}")
    
    return {
        "total_balance": balance,
        "total_income": total_income_month,
        "total_expense": total_expense_month,
        "pending_income": pending_income,
        "pending_expense": pending_expense,
        "income_pending_list": [TransactionResponse.from_orm(t) for t in transactions if t.type == TransactionType.income and not is_effectively_paid(t, now_naive)], # Ajuste para o schema
        "expense_pending_list": [TransactionResponse.from_orm(t) for t in transactions if t.type == TransactionType.expense and not is_effectively_paid(t, now_naive)],
        "by_category": by_category_expense,
        "by_category_income": by_category_income,
        "balance_evolution": balance_evolution,
        "accounts_summary": accounts_summary
    }

    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Deleta uma transação (verificando se pertence ao usuário)"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    db.delete(transaction)
    db.commit()
    
    print(f"DEBUG: Transação {transaction_id} deletada para user {user_id}")
    return {"message": "Transação deletada com sucesso"}

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id)
):
    """Upload de foto do comprovante (JPG, PNG ou PDF, até 5MB)"""
    import os, uuid
    
    # Validar tipo do arquivo
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, WebP ou PDF.")
    
    # Validar tamanho (5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 5MB.")
    
    # Criar diretório de uploads se não existir
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Gerar nome único
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{user_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Salvar arquivo
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {"filename": filename, "url": f"/api/transactions/uploads/{filename}"}

@router.get("/uploads/{filename}")
async def get_upload(filename: str):
    """Serve o arquivo de comprovante armazenado"""
    import os
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    filepath = os.path.join(upload_dir, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(filepath)

@router.get("/net-worth", response_model=NetWorthResponse)
def get_net_worth(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()
    
    accounts_detail = []
    for acc in accounts:
        bal = acc.calculate_balance()
        accounts_detail.append({
            "id": acc.id,
            "name": acc.name,
            "type": acc.type or "Conta",
            "balance": bal
        })
    
    accounts_total = sum(acc.calculate_balance() for acc in accounts)
    investments_total = sum(inv.current_value for inv in investments)
    
    credit_card_debt = db.query(func.sum(Transaction.value)).filter(
        Transaction.user_id == user_id,
        Transaction.credit_card_id != None,
        Transaction.is_paid == False
    ).scalar() or 0.0
    
    # Empréstimos e financiamentos: transações de categoria "empréstimo" ou "financiamento" não pagas
    loans_total = db.query(func.sum(Transaction.value)).join(
        Category, Transaction.category_id == Category.id, isouter=True
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.expense,
        Transaction.is_paid == False,
        Transaction.credit_card_id == None,
        func.lower(Category.name).contains("empréstimo") | func.lower(Category.name).contains("financiamento")
    ).scalar() or 0.0
    
    total_assets = max(0.0, accounts_total) + investments_total
    total_liabilities = abs(min(0.0, accounts_total)) + credit_card_debt + loans_total
    
    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
        "investments_total": investments_total,
        "accounts_total": accounts_total,
        "credit_cards_debt": credit_card_debt,
        "loans_total": loans_total,
        "accounts_detail": accounts_detail
    }

@router.get("/projection", response_model=BalanceProjectionResponse)
def get_projection(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    current_balance = sum(acc.calculate_balance() for acc in accounts)
    
    fixed_trans = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.is_fixed == True
    ).all()
    
    projection = []
    running_balance = current_balance
    now = datetime.utcnow()
    
    # Adicionar médias das variáveis também
    non_fixed = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.is_fixed == False,
        Transaction.date >= now - timedelta(days=90)
    ).all()
    
    avg_var_income = sum(t.value for t in non_fixed if t.type == TransactionType.income) / 3.0
    avg_var_expense = sum(t.value for t in non_fixed if t.type == TransactionType.expense) / 3.0
    
    for m in range(1, 7):
        proj_date = now + timedelta(days=30 * m)
        months_pt = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        month_name = f"{months_pt[proj_date.month - 1]} {proj_date.year}"
        
        proj_income = avg_var_income
        proj_expense = avg_var_expense
        
        for t in fixed_trans:
            if t.type == TransactionType.income:
                proj_income += t.value
            else:
                proj_expense += t.value
                
        running_balance += (proj_income - proj_expense)
        
        projection.append({
            "month": month_name,
            "projected_income": proj_income,
            "projected_expense": proj_expense,
            "projected_balance": running_balance
        })
        
    return {
        "current_balance": current_balance,
        "projection": projection
    }

@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    import io
    contents = await file.read()
    filename = file.filename.lower()
    
    parsed = []
    
    if filename.endswith(".ofx"):
        from ofxparse import OfxParser
        try:
            ofx = OfxParser.parse(io.BytesIO(contents))
            account = ofx.account
            statement = account.statement
            for transaction in statement.transactions:
                parsed.append({
                    "date": transaction.date,
                    "value": abs(float(transaction.amount)),
                    "type": "income" if transaction.amount > 0 else "expense",
                    "description": transaction.payee or transaction.memo or "Transação OFX",
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao parsear arquivo OFX: {str(e)}")
            
    elif filename.endswith(".csv"):
        try:
            try:
                text = contents.decode("utf-8")
            except UnicodeDecodeError:
                text = contents.decode("latin-1")
                
            import csv
            
            with open("debug_last_import.csv", "w", encoding="utf-8") as f:
                f.write(text)
            
            # Tentar adivinhar o delimitador automaticamente
            delim = ";" if ";" in text else ","
            reader = csv.reader(io.StringIO(text), delimiter=delim)
            rows = list(reader)
            
            if not rows:
                raise Exception("Arquivo CSV vazio")
                
            # Detectar se há cabeçalho
            first_row = rows[0]
            has_header = False
            is_own_export = False
            
            if len(first_row) > 0 and "ID" in first_row[0].upper() and len(first_row) > 3 and "DATA" in first_row[1].upper():
                has_header = True
                is_own_export = True
            elif len(first_row) > 1:
                val_clean = first_row[1].strip().replace(",", ".")
                try:
                    float(val_clean)
                except ValueError:
                    has_header = True
                    
            start_idx = 1 if has_header else 0
            for row in rows[start_idx:]:
                if not row or len(row) < 2 or not row[0].strip():
                    continue
                
                if is_own_export and len(row) >= 5:
                    # Formato do próprio App: ID(0), Data(1), Tipo(2), Valor(3), Descrição(4)
                    date_str = row[1].strip()
                    try:
                        date_val = datetime.strptime(date_str, "%Y-%m-%d")
                    except ValueError:
                        date_val = datetime.utcnow()
                    
                    try:
                        val = abs(float(row[3].strip()))
                    except ValueError:
                        continue
                    
                    t_type = "income" if row[2].strip().lower() == "income" else "expense"
                    desc_val = row[4].strip()
                    
                    parsed.append({
                        "date": date_val,
                        "value": val,
                        "type": t_type,
                        "description": desc_val,
                    })
                    continue

                # Fallback genérico para CSV de outros bancos
                date_str = row[0].strip()
                try:
                    date_val = datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    try:
                        date_val = datetime.strptime(date_str, "%d/%m/%Y")
                    except ValueError:
                        date_val = datetime.utcnow()
                
                # Tenta encontrar qual coluna é o valor
                val_idx = -1
                clean_val = 0.0
                for i in range(1, len(row)):
                    v_str = row[i].replace('R$', '').replace(' ', '').strip()
                    # Formato brasileiro: 1.500,00 -> 1500.00
                    if v_str.count(',') == 1 and v_str.count('.') >= 1:
                        v_str = v_str.replace('.', '').replace(',', '.')
                    # Apenas vírgula: 150,00 -> 150.00
                    elif v_str.count(',') == 1 and v_str.count('.') == 0:
                        v_str = v_str.replace(',', '.')
                        
                    try:
                        clean_val = float(v_str)
                        val_idx = i
                        break
                    except ValueError:
                        continue
                
                if val_idx == -1:
                    continue
                
                # A descrição será a primeira coluna após a data que não seja o valor
                desc_val = "Transação CSV"
                for i in range(1, len(row)):
                    if i != val_idx and row[i].strip():
                        desc_val = row[i].strip()
                        break
                
                t_type = "income" if clean_val >= 0 else "expense"
                val = abs(clean_val)
                
                parsed.append({
                    "date": date_val,
                    "value": val,
                    "type": t_type,
                    "description": desc_val,
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao parsear arquivo CSV: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Formato não suportado. Envie um arquivo .ofx ou .csv")
        
    reconciled = []
    for item in parsed:
        date_min = item["date"] - timedelta(days=2)
        date_max = item["date"] + timedelta(days=2)
        existing = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.value == item["value"],
            Transaction.type == item["type"],
            Transaction.date >= date_min,
            Transaction.date <= date_max
        ).first()
        
        matched_category = None
        categories = db.query(Category).filter(
            (Category.user_id == user_id) | (Category.is_default == True)
        ).all()
        for cat in categories:
            if cat.name.lower() in item["description"].lower():
                matched_category = cat
                break
                
        reconciled.append({
            "date": item["date"].strftime("%Y-%m-%d"),
            "value": item["value"],
            "type": item["type"],
            "description": item["description"],
            "already_exists": existing is not None,
            "existing_id": existing.id if existing else None,
            "suggested_category_id": matched_category.id if matched_category else None,
            "suggested_category_name": matched_category.name if matched_category else None
        })
        
    return {"transactions": reconciled}

@router.get("/export/csv")
def export_csv(
    type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    import io, csv
    from fastapi.responses import StreamingResponse
    
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if type and type != 'all':
        query = query.filter(func.lower(cast(Transaction.type, String)).contains(type.lower()))
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
        
    transactions = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Data", "Tipo", "Valor", "Descrição", "Pago", "Fixo", "Categoria", "Método de Pagamento", "Contato", "Endereço"])
    
    for t in transactions:
        cat_name = t.category.name if t.category else ""
        writer.writerow([
            t.id,
            t.date.strftime("%Y-%m-%d"),
            t.type.value,
            t.value,
            t.description or "",
            "Sim" if t.is_paid else "Não",
            "Sim" if t.is_fixed else "Não",
            cat_name,
            t.payment_method.value if t.payment_method else "",
            t.contact_name or "",
            t.location_address or ""
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transacoes.csv"}
    )

@router.get("/export/pdf")
def export_pdf(
    type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    from fpdf import FPDF
    from fastapi.responses import Response
    
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if type and type != 'all':
        query = query.filter(func.lower(cast(Transaction.type, String)).contains(type.lower()))
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
        
    transactions = query.order_by(Transaction.date.desc()).all()
    
    class PDF(FPDF):
        def header(self):
            self.set_font('helvetica', 'B', 15)
            self.cell(0, 10, 'Relatório de Transações - LISO', border=False, new_x="LMARGIN", new_y="NEXT", align='C')
            self.ln(10)
        def footer(self):
            self.set_y(-15)
            self.set_font('helvetica', 'I', 8)
            self.cell(0, 10, f'Página {self.page_no()}', align='C')
            
    pdf = PDF()
    pdf.add_page()
    pdf.set_font('helvetica', '', 10)
    
    pdf.set_font('helvetica', 'B', 10)
    pdf.cell(25, 8, 'Data', border=1)
    pdf.cell(20, 8, 'Tipo', border=1)
    pdf.cell(25, 8, 'Valor', border=1)
    pdf.cell(50, 8, 'Descrição', border=1)
    pdf.cell(35, 8, 'Categoria', border=1)
    pdf.cell(35, 8, 'Contato', border=1, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    total_income = 0.0
    total_expense = 0.0
    
    for t in transactions:
        cat_name = t.category.name if t.category else ""
        t_type = "Receita" if t.type == TransactionType.income else "Despesa"
        val_str = f"R$ {t.value:,.2f}"
        
        pdf.cell(25, 8, t.date.strftime("%Y-%m-%d"), border=1)
        pdf.cell(20, 8, t_type, border=1)
        pdf.cell(25, 8, val_str, border=1)
        pdf.cell(50, 8, (t.description or "")[:25], border=1)
        pdf.cell(35, 8, cat_name[:18], border=1)
        pdf.cell(35, 8, (t.contact_name or "")[:18], border=1, new_x="LMARGIN", new_y="NEXT")
        
        if t.type == TransactionType.income:
            total_income += t.value
        else:
            total_expense += t.value
            
    pdf.ln(10)
    pdf.set_font('helvetica', 'B', 11)
    pdf.cell(0, 10, f"Total Receitas: R$ {total_income:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Despesas: R$ {total_expense:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Saldo do Período: R$ {(total_income - total_expense):,.2f}", new_x="LMARGIN", new_y="NEXT")
    
    pdf_bytes = bytes(pdf.output())
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio.pdf"}
    )

@router.get("/export/annual-csv")
def export_annual_csv(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Exporta todas as transações do ano em CSV no mesmo formato do CSV mensal"""
    from datetime import datetime
    import io, csv
    from fastapi.responses import StreamingResponse
    
    # Pega o ano atual
    current_year = datetime.now().year
    
    query = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        func.extract('year', Transaction.date) == current_year
    ).order_by(Transaction.date.desc())
    
    transactions = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Mesmo cabeçalho do CSV mensal para compatibilidade
    writer.writerow(["ID", "Data", "Tipo", "Valor", "Descrição", "Pago", "Fixo", "Categoria", "Método de Pagamento", "Contato", "Endereço"])
    
    for t in transactions:
        cat_name = t.category.name if t.category else ""
        writer.writerow([
            t.id,
            t.date.strftime("%Y-%m-%d"),
            t.type.value,
            t.value,
            t.description or "",
            "Sim" if t.is_paid else "Não",
            "Sim" if t.is_fixed else "Não",
            cat_name,
            t.payment_method.value if t.payment_method else "",
            t.contact_name or "",
            t.location_address or ""
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_anual_{current_year}.csv"}
    )

@router.get("/export/annual-pdf")
def export_annual_pdf(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Exporta relatório anual em PDF com análise por categoria, mês e gráficos"""
    from datetime import datetime
    from fpdf import FPDF
    from fastapi.responses import Response
    
    current_year = datetime.now().year
    
    query = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        func.extract('year', Transaction.date) == current_year
    ).order_by(Transaction.date)
    
    transactions = query.all()
    
    # Análise por categoria
    category_summary = {}
    monthly_summary = {m: {'income': 0.0, 'expense': 0.0} for m in range(1, 13)}
    
    for t in transactions:
        month = t.date.month
        cat_name = t.category.name if t.category else "Sem Categoria"
        
        if cat_name not in category_summary:
            category_summary[cat_name] = {'income': 0.0, 'expense': 0.0}
        
        if t.type == TransactionType.income:
            category_summary[cat_name]['income'] += t.value
            monthly_summary[month]['income'] += t.value
        else:
            category_summary[cat_name]['expense'] += t.value
            monthly_summary[month]['expense'] += t.value
    
    class PDF(FPDF):
        def header(self):
            self.set_font('helvetica', 'B', 18)
            self.cell(0, 15, f'Relatório Anual {current_year}', border=False, new_x="LMARGIN", new_y="NEXT", align='C')
            self.set_font('helvetica', 'I', 10)
            self.cell(0, 8, f'Gerado em {datetime.now().strftime("%d/%m/%Y")}', border=False, new_x="LMARGIN", new_y="NEXT", align='C')
            self.ln(5)
            
        def footer(self):
            self.set_y(-15)
            self.set_font('helvetica', 'I', 8)
            self.cell(0, 10, f'Página {self.page_no()}', align='C')
    
    pdf = PDF()
    pdf.add_page()
    pdf.set_font('helvetica', '', 10)
    
    # Totais
    total_income = sum(v['income'] for v in category_summary.values())
    total_expense = sum(v['expense'] for v in category_summary.values())
    saldo = total_income - total_expense
    
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'RESUMO GERAL', border=False, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 11)
    pdf.cell(60, 8, f"Total de Receitas:", border=0)
    pdf.cell(0, 8, f"R$ {total_income:,.2f}", border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.cell(60, 8, f"Total de Despesas:", border=0)
    pdf.cell(0, 8, f"R$ {total_expense:,.2f}", border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', 'B', 11)
    pdf.cell(60, 8, f"Saldo do Ano:", border=0)
    color = 0 if saldo >= 0 else 255
    pdf.set_text_color(0, 128 if saldo >= 0 else 0, 0 if saldo >= 0 else 200)
    pdf.cell(0, 8, f"R$ {saldo:,.2f}", border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    
    pdf.ln(5)
    
    # Tabela de categorias
    pdf.set_font('helvetica', 'B', 11)
    pdf.cell(0, 10, 'ANÁLISE POR CATEGORIA', border=False, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.cell(40, 8, 'Categoria', border=1)
    pdf.cell(30, 8, 'Receitas', border=1, align='R')
    pdf.cell(30, 8, 'Despesas', border=1, align='R')
    pdf.cell(30, 8, 'Saldo', border=1, align='R', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    for cat_name in sorted(category_summary.keys()):
        values = category_summary[cat_name]
        cat_saldo = values['income'] - values['expense']
        
        pdf.cell(40, 8, cat_name[:30], border=1)
        pdf.cell(30, 8, f"R$ {values['income']:,.2f}", border=1, align='R')
        pdf.cell(30, 8, f"R$ {values['expense']:,.2f}", border=1, align='R')
        pdf.cell(30, 8, f"R$ {cat_saldo:,.2f}", border=1, align='R', new_x="LMARGIN", new_y="NEXT")
    
    # Nova página para resumo mensal
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'ANÁLISE MENSAL', border=False, new_x="LMARGIN", new_y="NEXT")
    
    months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    
    pdf.set_font('helvetica', 'B', 9)
    pdf.cell(30, 8, 'Mês', border=1)
    pdf.cell(30, 8, 'Receitas', border=1, align='R')
    pdf.cell(30, 8, 'Despesas', border=1, align='R')
    pdf.cell(30, 8, 'Saldo', border=1, align='R', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    for m in range(1, 13):
        income = monthly_summary[m]['income']
        expense = monthly_summary[m]['expense']
        saldo_mes = income - expense
        
        pdf.cell(30, 8, months[m-1], border=1)
        pdf.cell(30, 8, f"R$ {income:,.2f}", border=1, align='R')
        pdf.cell(30, 8, f"R$ {expense:,.2f}", border=1, align='R')
        pdf.cell(30, 8, f"R$ {saldo_mes:,.2f}", border=1, align='R', new_x="LMARGIN", new_y="NEXT")
    
    pdf_bytes = bytes(pdf.output())
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_anual_{current_year}.pdf"}
    )

# ─── RF18: ALERTAS DE GASTOS ANORMAIS ─────────────────────────────────────────
@router.get("/spending-alerts")
def get_spending_alerts(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    threshold_warning: float = Query(30.0, description="% de aumento para alerta (padrão 30%)"),
    threshold_critical: float = Query(80.0, description="% de aumento para alerta crítico (padrão 80%)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    RF18 — Detecta gastos anormais por categoria.

    Compara o total gasto em cada categoria no mês atual com a
    média dos últimos 3 meses. Retorna categorias onde o aumento
    supera o limiar configurado (padrão: 30% → warning, 80% → critical).
    """
    now = datetime.utcnow()
    target_month = month if month else now.month
    target_year  = year  if year  else now.year

    # Intervalo do mês atual
    current_start = datetime(target_year, target_month, 1)
    current_end   = (
        datetime(target_year + 1, 1, 1)
        if target_month == 12
        else datetime(target_year, target_month + 1, 1)
    )

    # ── 1. Gastos do mês atual por categoria ─────────────────────────────────
    current_rows = (
        db.query(
            Transaction.category_id,
            func.sum(Transaction.value).label("total")
        )
        .filter(
            Transaction.user_id    == user_id,
            Transaction.type       == TransactionType.expense,
            Transaction.date       >= current_start,
            Transaction.date       <  current_end,
            Transaction.category_id != None
        )
        .group_by(Transaction.category_id)
        .all()
    )
    current_by_cat = {row.category_id: float(row.total) for row in current_rows}

    if not current_by_cat:
        return {"alerts": [], "analyzed_month": f"{target_month:02d}/{target_year}"}

    # ── 2. Gastos dos 3 meses anteriores por categoria ───────────────────────
    history_start = current_start - timedelta(days=91)   # ~3 meses

    history_rows = (
        db.query(
            Transaction.category_id,
            func.sum(Transaction.value).label("total"),
            func.count(
                func.distinct(
                    func.strftime("%Y-%m", Transaction.date)
                )
            ).label("months_count")
        )
        .filter(
            Transaction.user_id    == user_id,
            Transaction.type       == TransactionType.expense,
            Transaction.date       >= history_start,
            Transaction.date       <  current_start,
            Transaction.category_id != None
        )
        .group_by(Transaction.category_id)
        .all()
    )
    history_by_cat = {
        row.category_id: float(row.total) / max(int(row.months_count), 1)
        for row in history_rows
    }

    # ── 3. Comparar e montar alertas ─────────────────────────────────────────
    alerts = []
    for cat_id, current_total in current_by_cat.items():
        avg = history_by_cat.get(cat_id)
        if avg is None or avg <= 0:
            # Sem histórico — só alertar se for valor significativo (> R$50)
            if current_total > 50:
                category = db.query(Category).filter(Category.id == cat_id).first()
                alerts.append({
                    "category_id":           cat_id,
                    "category_name":         category.name if category else "Categoria",
                    "category_icon":         category.icon if category else None,
                    "category_color":        category.color if category else None,
                    "current_month_total":   round(current_total, 2),
                    "avg_last_3_months":     0.0,
                    "increase_pct":          100.0,
                    "severity":              "warning",
                    "message":               f"Primeira vez gastando em '{(category.name if category else 'esta categoria')}' nos últimos 3 meses."
                })
            continue

        increase_pct = ((current_total - avg) / avg) * 100.0

        if increase_pct >= threshold_warning:
            category = db.query(Category).filter(Category.id == cat_id).first()
            severity = "critical" if increase_pct >= threshold_critical else "warning"
            alerts.append({
                "category_id":           cat_id,
                "category_name":         category.name if category else "Categoria",
                "category_icon":         category.icon if category else None,
                "category_color":        category.color if category else None,
                "current_month_total":   round(current_total, 2),
                "avg_last_3_months":     round(avg, 2),
                "increase_pct":          round(increase_pct, 1),
                "severity":              severity,
                "message":               (
                    f"Gasto em '{(category.name if category else 'categoria')}' "
                    f"está {increase_pct:.0f}% acima da média dos últimos 3 meses "
                    f"(R$ {avg:.2f} → R$ {current_total:.2f})."
                )
            })

    # Ordenar: críticos primeiro, depois por % de aumento descendente
    alerts.sort(key=lambda a: (0 if a["severity"] == "critical" else 1, -a["increase_pct"]))

    return {
        "alerts": alerts,
        "analyzed_month": f"{target_month:02d}/{target_year}",
        "threshold_warning":  threshold_warning,
        "threshold_critical": threshold_critical,
    }

# ─── RF28: FLUXO DE CAIXA DIÁRIO ─────────────────────────────────────────────
@router.get("/daily-flow")
def get_daily_flow(
    month: Optional[int] = Query(None),
    year:  Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    RF28 — Fluxo de caixa diário.

    Retorna, para cada dia do mês informado, o total de receitas,
    total de despesas e o saldo acumulado até aquele dia.
    Usado pelo gráfico 'Fluxo de Caixa Diário' no Dashboard.
    """
    import calendar

    now = datetime.utcnow()
    target_month = month if month else now.month
    target_year  = year  if year  else now.year

    # Intervalo completo do mês
    first_day = datetime(target_year, target_month, 1)
    last_day_num = calendar.monthrange(target_year, target_month)[1]
    last_day  = datetime(target_year, target_month, last_day_num, 23, 59, 59)

    # Busca todas as transações do mês de uma vez (eficiência)
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date    >= first_day,
            Transaction.date    <= last_day,
        )
        .all()
    )

    # Agrupa por dia
    daily: dict[int, dict] = {}
    for t in transactions:
        day = t.date.day
        if day not in daily:
            daily[day] = {"income": 0.0, "expense": 0.0}
        if t.type == TransactionType.income:
            daily[day]["income"] += float(t.value)
        else:
            daily[day]["expense"] += float(t.value)

    # Monta resultado com saldo acumulado dia a dia
    result = []
    running_balance = 0.0
    today_day = now.day if (now.month == target_month and now.year == target_year) else last_day_num

    # Determina o dia final da listagem para evitar lacunas na linha do tempo
    max_day_with_data = max([t.date.day for t in transactions]) if transactions else 1
    end_day = max(today_day, max_day_with_data)

    for day_num in range(1, end_day + 1):
        inc = daily.get(day_num, {}).get("income", 0.0)
        exp = daily.get(day_num, {}).get("expense", 0.0)
        running_balance += inc - exp

        result.append({
            "day":     day_num,
            "label":   f"{day_num:02d}",
            "income":  round(inc, 2),
            "expense": round(exp, 2),
            "balance": round(running_balance, 2),
        })

    return {
        "month":     target_month,
        "year":      target_year,
        "daily_flow": result,
    }

