import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

// Rede de segurança: se qualquer tela quebrar em runtime, mostra uma mensagem
// recuperável em vez de deixar a página totalmente em branco.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erro inesperado' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturou:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">!</div>
          <h1 className="text-lg font-bold text-[#1e3a5f] mb-1">Ocorreu um erro nesta tela</h1>
          <p className="text-sm text-gray-500 mb-4">
            Seus dados estão salvos. Você pode tentar novamente ou recarregar o sistema.
          </p>
          <p className="text-[11px] text-gray-400 bg-gray-50 border rounded p-2 mb-4 font-mono break-words">{this.state.message}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={this.handleReset} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              Tentar novamente
            </button>
            <button onClick={this.handleReload} className="px-4 py-2 text-sm rounded-md bg-[#2563eb] text-white hover:bg-blue-700">
              Recarregar sistema
            </button>
          </div>
        </div>
      </div>
    );
  }
}
