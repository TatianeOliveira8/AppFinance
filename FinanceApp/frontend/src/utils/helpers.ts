export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Precisa de letra maiúscula');
  if (!/[0-9]/.test(password)) errors.push('Precisa de número');
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getTransactionTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    income: 'Receita',
    expense: 'Despesa',
  };
  return labels[type] || type;
};

export const getTransactionTypeColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    income: '#FF8C00', // Laranja
    expense: '#F44336', // Vermelho
  };
  return colors[type] || '#000';
};

export const getTransactionTypeIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    income: '📈',
    expense: '📉',
  };
  return icons[type] || '💰';
};
