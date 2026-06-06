import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { CadastroMultiStepForm } from '@/features/cadastro/components';

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
 * Phase 2 Plan 02-06: o formulário agora dirige o fluxo de submit (chama
 * `cadastrarCandidato` + `tryAutoLogin` + navega para `/candidato/perfil`)
 * internamente. Esta página só hidrata o `vagaId` no localStorage para que
 * as Phases 3/4 possam consumi-lo depois do login. Não passa mais `onSubmit`.
 */
export function CadastroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Obter vagaId dos query params para persistência cross-session
  const vagaIdFromQuery = searchParams.get('vagaId');

  // Salvar vagaId no localStorage — Phase 4 candidatura flow lê este valor
  // após o login do candidato e redireciona para /candidato/candidatura
  useEffect(() => {
    if (vagaIdFromQuery) {
      localStorage.setItem('candidatura_vaga_id', vagaIdFromQuery);
    }
  }, [vagaIdFromQuery]);

  return (
    <BackgroundImage
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4">
        <div className="w-full max-w-4xl mx-auto">
          <CadastroMultiStepForm onCancel={() => navigate('/auth/login')} />
        </div>
      </div>
    </BackgroundImage>
  );
}
