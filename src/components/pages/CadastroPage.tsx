import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { CadastroMultiStepForm } from '@/features/cadastro/components';
import { cadastrarCandidato } from '@/features/cadastro/services/cadastroService';
import type { CandidatoFormData } from '@/features/cadastro/schemas';
import { toast } from 'sonner';

/**
 * Página de Cadastro Completo de Candidatos
 *
 * Esta página renderiza o formulário multi-step implementado no PRD-1
 * com 4 etapas:
 * 1. Dados Pessoais (com CPF, verificação de duplicados, Instagram, LinkedIn e Senha)
 * 2. Endereço (com integração ViaCEP)
 * 3. Disponibilidade (turno e modelo de trabalho)
 * 4. Autorizações LGPD
 *
 * Features:
 * - Validação client-side com Zod + React Hook Form
 * - Auto-formatação de CPF, Telefone, CEP
 * - Verificação de duplicados em tempo real
 * - Auto-preenchimento de endereço via ViaCEP
 * - Validação de senha forte com confirmação
 * - Transação multi-table no Supabase
 * - Integração com N8N webhooks
 * - Responsive design (mobile-first)
 * - Feedback visual completo
 */
export function CadastroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Obter vagaId dos query params ou localStorage
  const vagaIdFromQuery = searchParams.get('vagaId');
  const vagaIdFromStorage = localStorage.getItem('candidatura_vaga_id');
  const vagaId = vagaIdFromQuery || vagaIdFromStorage;

  // Salvar vagaId no localStorage para persistência
  useEffect(() => {
    if (vagaIdFromQuery) {
      localStorage.setItem('candidatura_vaga_id', vagaIdFromQuery);
    }
  }, [vagaIdFromQuery]);

  /**
   * Handler de submit do formulário
   * Usa a senha definida pelo usuário no formulário
   */
  const handleSubmit = async (data: CandidatoFormData) => {
    try {
      // Cadastrar candidato com a senha definida pelo usuário
      await cadastrarCandidato(data);

      toast.success('Cadastro realizado com sucesso!', {
        description: 'Agora preencha o formulário inicial para continuar.',
      });

      // Redirecionar para instruções do formulário (com vagaId se existir)
      if (vagaId) {
        navigate(`/candidato/candidatura/instrucoes?vagaId=${vagaId}`);
      } else {
        // Fallback: redirecionar sem vagaId
        navigate('/candidato/candidatura/instrucoes');
      }

      // NOTA: Webhook N8N será enviado APÓS preencher o formulário inicial
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao realizar cadastro', {
        description: 'Por favor, tente novamente ou entre em contato com o suporte.',
      });
      throw error; // Re-throw para o componente tratar
    }
  };

  return (
    <BackgroundImage
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4">
        <div className="w-full max-w-4xl mx-auto">
          <CadastroMultiStepForm onSubmit={handleSubmit} />
        </div>
      </div>
    </BackgroundImage>
  );
}
