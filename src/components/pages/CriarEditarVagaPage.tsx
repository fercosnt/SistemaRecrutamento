import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { RichTextEditor } from '../RichTextEditor';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  TemplateVagaSelector,
  PesosSliders,
} from '@/features/config-vaga/components';
import {
  useUpdateVagaConfig,
  usePublishVaga,
} from '@/features/config-vaga/hooks/useConfigVaga';
import { updateVagaBase } from '@/features/config-vaga/services/configVagaService';
import { publishGate } from '@/features/config-vaga/publishGate';
import type {
  PesosAvaliacao,
  TestesAplicaveis,
  StatusVaga as DbStatusVaga,
} from '@/features/config-vaga/types/configVagaTypes';
import type { CargoSlug } from '@/features/config-vaga/templates/cargoTemplates';

type StatusVaga = 'ativa' | 'inativa' | 'rascunho';

const DEFAULT_PESOS: PesosAvaliacao = {
  triagem: 0,
  work_sample_sjt: 0,
  redacao_cultural: 0,
  entrevista: 0,
};
type TipoPergunta = 'unica-escolha' | 'multipla-escolha' | 'texto-curto' | 'texto-longo' | 'numerico';

interface Pergunta {
  id: string;
  pergunta: string;
  ajuda: string;
  tipo: TipoPergunta;
  opcoes?: string; // Para única/múltipla escolha (separadas por ;)
}

interface DadosVaga {
  // Informações Básicas
  titulo: string;
  slug: string;
  area: string;
  cidade: string;
  estado: string;
  tipoContrato: string;
  modalidade: string;
  salarioMin: string;
  salarioMax: string;
  jornada: string;
  status: StatusVaga;
  
  // Landing Page
  nomeVaga: string;
  oQueVoceFaz: string;
  responsabilidades: string;
  formacao: string;
  experiencia: string;
  conhecimentosTecnicos: string;
  habilidadesEssenciais: string;
  pessoaCerta: string;
  diferenciais: string;
  
  // Perguntas
  perguntasTriagem: Pergunta[];
  perguntasCultura: Pergunta[];
  
  // IA
  instrucoesIA: string;
}

export function CriarEditarVagaPage() {
  const { id: vagaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('vagas-rh');
  const [activeTab, setActiveTab] = useState('informacoes');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBase, setIsSavingBase] = useState(false);
  const isEdicao = !!vagaId;
  
  const [dados, setDados] = useState<DadosVaga>({
    titulo: '',
    slug: '',
    area: '',
    cidade: '',
    estado: '',
    tipoContrato: '',
    modalidade: '',
    salarioMin: '',
    salarioMax: '',
    jornada: '',
    status: 'rascunho',
    nomeVaga: '',
    oQueVoceFaz: '',
    responsabilidades: '',
    formacao: '',
    experiencia: '',
    conhecimentosTecnicos: '',
    habilidadesEssenciais: '',
    pessoaCerta: '',
    diferenciais: '',
    perguntasTriagem: [],
    perguntasCultura: [],
    instrucoesIA: '',
  });

  // ── M2 config (Phase 7) ─────────────────────────────────────────────────────
  // `dbStatus` is the AUTHORITATIVE persisted status (status_vaga has 4 live
  // values — Pitfall 5). The Publicar CTA only renders when it is 'rascunho'.
  const [dbStatus, setDbStatus] = useState<DbStatusVaga>('rascunho');
  const [pesos, setPesos] = useState<PesosAvaliacao>(DEFAULT_PESOS);
  const [testesAplicaveis, setTestesAplicaveis] = useState<TestesAplicaveis>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CargoSlug | null>(null);

  const updateVagaConfigMut = useUpdateVagaConfig(vagaId ?? '');
  const publishVagaMut = usePublishVaga(vagaId ?? '');

  // Carregar dados da vaga se estiver editando. Hydration reads ONLY real
  // `vagas` columns (FUNIL-04) — the 8 phantom reads are gone. async/await so
  // setIsLoading(false) lives in a try/finally (no `.finally` on PromiseLike).
  useEffect(() => {
    if (!isEdicao || !vagaId) return;
    setIsLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('vagas')
          .select('*')
          .eq('id', vagaId)
          .single();

        if (error) {
          console.error('Erro ao carregar vaga:', error);
          toast.error('Erro ao carregar dados da vaga');
          navigate('/rh/vagas');
          return;
        }

        if (data) {
          // Mapear dados do banco (colunas reais) para o formulário.
          setDados({
            titulo: data.titulo || '',
            slug: data.slug || '',
            area: data.departamento || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            tipoContrato: data.tipo_contrato || '',
            modalidade: data.modelo_trabalho || '',
            salarioMin:
              data.faixa_salarial_min != null
                ? String(data.faixa_salarial_min)
                : '',
            salarioMax:
              data.faixa_salarial_max != null
                ? String(data.faixa_salarial_max)
                : '',
            jornada: data.jornada_trabalho || '',
            status: (data.status as StatusVaga) || 'rascunho',
            nomeVaga: data.titulo || '',
            oQueVoceFaz: data.descricao_curta || '',
            responsabilidades: data.responsabilidades || '',
            formacao: data.requisitos_formacao || '',
            experiencia: data.requisitos_experiencia || '',
            conhecimentosTecnicos: data.requisitos_tecnicos || '',
            habilidadesEssenciais: data.requisitos_habilidades || '',
            pessoaCerta: data.perfil_ideal || '',
            diferenciais: data.diferenciais || '',
            perguntasTriagem: [], // TODO: carregar perguntas da tabela relacionada
            perguntasCultura: [], // TODO: carregar perguntas da tabela relacionada
            instrucoesIA: '', // TODO: carregar instruções se houver
          });

          // ── M2 config hydration (Phase 7) ──────────────────────────────
          setDbStatus((data.status as DbStatusVaga) || 'rascunho');
          if (data.pesos_avaliacao) {
            setPesos(data.pesos_avaliacao as unknown as PesosAvaliacao);
          }
          if (data.testes_aplicaveis) {
            setTestesAplicaveis(
              data.testes_aplicaveis as unknown as TestesAplicaveis
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isEdicao, vagaId, navigate]);

  // Estados brasileiros
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Principais cidades (exemplo simplificado)
  const cidades = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília',
    'Curitiba', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Recife',
    'Manaus', 'Goiânia', 'Belém', 'Campinas', 'Santos'
  ];

  const tiposContrato = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer'];
  const modalidades = ['Presencial', 'Remoto', 'Híbrido'];
  const jornadas = ['20h/semana', '30h/semana', '40h/semana', '44h/semana', 'Flexível'];
  
  const areas = [
    'Clínico',
    'Comercial',
    'Marketing',
    'RH',
    'TI',
    'Financeiro',
    'Administrativo',
    'Operacional',
  ];

  const tiposPergunta: { value: TipoPergunta; label: string }[] = [
    { value: 'unica-escolha', label: 'Única Escolha' },
    { value: 'multipla-escolha', label: 'Múltipla Escolha' },
    { value: 'texto-curto', label: 'Texto Curto' },
    { value: 'texto-longo', label: 'Texto Longo' },
    { value: 'numerico', label: 'Numérico' },
  ];

  // Gerar slug a partir do título
  const gerarSlug = (titulo: string) => {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTituloChange = (value: string) => {
    setDados({
      ...dados,
      titulo: value,
      slug: gerarSlug(value),
    });
  };

  const handleAdicionarPergunta = (tipo: 'triagem' | 'cultura') => {
    const novaPergunta: Pergunta = {
      id: `pergunta-${Date.now()}`,
      pergunta: '',
      ajuda: '',
      tipo: 'unica-escolha',
      opcoes: '',
    };

    if (tipo === 'triagem') {
      setDados({
        ...dados,
        perguntasTriagem: [...dados.perguntasTriagem, novaPergunta],
      });
    } else {
      setDados({
        ...dados,
        perguntasCultura: [...dados.perguntasCultura, novaPergunta],
      });
    }
  };

  const handleRemoverPergunta = (tipo: 'triagem' | 'cultura', id: string) => {
    if (tipo === 'triagem') {
      setDados({
        ...dados,
        perguntasTriagem: dados.perguntasTriagem.filter(p => p.id !== id),
      });
    } else {
      setDados({
        ...dados,
        perguntasCultura: dados.perguntasCultura.filter(p => p.id !== id),
      });
    }
  };

  const handleUpdatePergunta = (
    tipo: 'triagem' | 'cultura',
    id: string,
    campo: keyof Pergunta,
    valor: string | TipoPergunta
  ) => {
    const perguntas = tipo === 'triagem' ? dados.perguntasTriagem : dados.perguntasCultura;
    const novasPerguntas = perguntas.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    );

    if (tipo === 'triagem') {
      setDados({ ...dados, perguntasTriagem: novasPerguntas });
    } else {
      setDados({ ...dados, perguntasCultura: novasPerguntas });
    }
  };

  // Persist the M2 config (testes_aplicaveis + pesos_avaliacao). Salvar rascunho
  // never validates (D-12). Only meaningful while the vaga exists (edit mode).
  const handleSalvarRascunho = async () => {
    if (!vagaId) {
      toast.error('Salve a vaga primeiro para persistir a configuração.');
      return;
    }
    try {
      await updateVagaConfigMut.mutateAsync({
        testes_aplicaveis: testesAplicaveis,
        pesos_avaliacao: pesos,
      });
      toast.success('Rascunho salvo.');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Erro ao salvar a configuração.'
      );
    }
  };

  // Salvar alterações (edit path, FUNIL-04) — persists the BASE fields + status
  // radio via updateVagaBase AND the existing config save (updateVagaConfigMut).
  // Config controls are unchanged; publish_vaga is not expanded (F7 deferred).
  const handleSalvarAlteracoes = async () => {
    if (!vagaId) {
      toast.error('Salve a vaga primeiro para persistir as alterações.');
      return;
    }
    setIsSavingBase(true);
    try {
      await updateVagaBase(vagaId, {
        titulo: dados.titulo,
        departamento: dados.area || null,
        cidade: dados.cidade || null,
        estado: dados.estado || null,
        faixaSalarialMin: dados.salarioMin ? Number(dados.salarioMin) : null,
        faixaSalarialMax: dados.salarioMax ? Number(dados.salarioMax) : null,
        jornada: dados.jornada || null,
        responsabilidades: dados.responsabilidades || null,
        formacao: dados.formacao || null,
        experiencia: dados.experiencia || null,
        tecnicos: dados.conhecimentosTecnicos || null,
        habilidades: dados.habilidadesEssenciais || null,
        diferenciais: dados.diferenciais || null,
        status: dados.status,
      });
      // Persist the config slice too (unchanged controls).
      await updateVagaConfigMut.mutateAsync({
        testes_aplicaveis: testesAplicaveis,
        pesos_avaliacao: pesos,
      });
      setDbStatus(dados.status as DbStatusVaga);
      toast.success('Alterações salvas.');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Erro ao salvar as alterações.'
      );
    } finally {
      setIsSavingBase(false);
    }
  };

  // Publicar vaga — runs the D-12 client gate (errors ONLY on this click), then
  // the server publish_vaga RPC (authoritative). Rendered only for rascunho.
  const handlePublicar = async () => {
    if (!vagaId) {
      toast.error('Salve a vaga primeiro para publicá-la.');
      return;
    }
    if (dbStatus !== 'rascunho') {
      // Pitfall 5: publish_vaga only transitions rascunho→ativa.
      toast.error(`Esta vaga já está ${dbStatus} — publicação não se aplica.`);
      return;
    }

    // Client gate (instant UX). The server re-validates on publish_vaga.
    const failures = publishGate({
      pesos_avaliacao: pesos,
      testes_aplicaveis: testesAplicaveis.map((t) => ({
        teste: t.teste,
        obrigatorio: t.obrigatorio,
        customizado: t.customizado,
      })),
      perguntas: [], // F7 question bank deferred (D-05) — knockout check no-ops.
    });

    if (failures.length > 0) {
      const faltam = 100 - (pesos.triagem + pesos.work_sample_sjt + pesos.redacao_cultural + pesos.entrevista);
      for (const f of failures) {
        if (f.code === 'PESOS_SOMA') {
          toast.error(
            `Os pesos precisam somar 100% antes de publicar. Ajuste os sliders (faltam ${faltam}%).`
          );
        } else if (f.code === 'SEM_TESTE_OBRIGATORIO') {
          toast.error(
            'Selecione ao menos um teste obrigatório antes de publicar a vaga.'
          );
        } else {
          toast.error(f.message);
        }
      }
      return;
    }

    try {
      // Persist the latest config, then flip rascunho→ativa server-side.
      await updateVagaConfigMut.mutateAsync({
        testes_aplicaveis: testesAplicaveis,
        pesos_avaliacao: pesos,
      });
      await publishVagaMut.mutateAsync();
      setDbStatus('ativa');
      toast.success('Vaga publicada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao publicar a vaga.');
    }
  };

  // Apply a cargo template: deep-copy its pesos+testes INTO the vaga form (D-04).
  const handleSelectTemplate = (
    config: { pesos_avaliacao: PesosAvaliacao; testes_aplicaveis: TestesAplicaveis },
    slug: CargoSlug
  ) => {
    setPesos(config.pesos_avaliacao);
    setTestesAplicaveis(config.testes_aplicaveis);
    setSelectedTemplate(slug);
  };

  const handleCancelar = () => {
    navigate('/rh/vagas');
  };

  // Loading state
  if (isLoading) {
    return (
      <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <div className="flex items-center justify-center min-h-screen">
          <Glass variant="white" blur="lg" className="p-8 rounded-xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando dados da vaga...</p>
          </Glass>
        </div>
      </RHLayout>
    );
  }

  return (
    <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <div className="space-y-6 pb-32">
        {/* HEADER */}
        <Glass variant="white" blur="lg" className="p-8 rounded-xl">
          <GlassButton
            variant="white"
            onClick={(e) => {
              e.preventDefault();
              handleCancelar();
            }}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </GlassButton>

          <h1 className="text-white drop-shadow-lg text-3xl mb-2">
            ✨ {isEdicao ? 'Editar Vaga' : 'Nova Vaga'}
          </h1>
          <p className="text-white/80 drop-shadow-sm">
            Preencha as informações abaixo para {isEdicao ? 'editar' : 'criar'} a vaga
          </p>
        </Glass>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Glass variant="white" blur="lg" className="rounded-xl overflow-hidden mb-6">
            <div className="overflow-x-auto kanban-scroll">
              <TabsList className="bg-transparent border-b border-white/20 rounded-none w-full justify-start p-0 h-auto flex-nowrap">
                <TabsTrigger
                  value="informacoes"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  📋 Informações
                </TabsTrigger>
                <TabsTrigger
                  value="landing-page"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  📄 Landing Page
                </TabsTrigger>
                <TabsTrigger
                  value="triagem"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  ❓ Triagem
                </TabsTrigger>
                <TabsTrigger
                  value="cultura"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  📝 Cultura
                </TabsTrigger>
                <TabsTrigger
                  value="ia"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  🤖 IA
                </TabsTrigger>
                <TabsTrigger
                  value="config"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  ⚙️ Avaliação
                </TabsTrigger>
              </TabsList>
            </div>
          </Glass>

          {/* ABA: INFORMAÇÕES BÁSICAS */}
          <TabsContent value="informacoes" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-6">
                {/* Título da Vaga */}
                <div className="space-y-2">
                  <Label htmlFor="titulo" className="text-white drop-shadow-sm">
                    Título da Vaga *
                  </Label>
                  <Input
                    id="titulo"
                    value={dados.titulo}
                    onChange={(e) => handleTituloChange(e.target.value)}
                    placeholder="Ex: Assistente Odontológico"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* URL Personalizada */}
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-white drop-shadow-sm">
                    URL Personalizada (slug)
                  </Label>
                  <Input
                    id="slug"
                    value={dados.slug}
                    onChange={(e) => setDados({ ...dados, slug: e.target.value })}
                    placeholder="assistente-odontologico"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  {dados.slug && (
                    <p className="text-white/60 drop-shadow-sm text-sm">
                      Preview: recruta.beautysmile.com.br/vagas/{dados.slug}
                    </p>
                  )}
                </div>

                {/* Área */}
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-white drop-shadow-sm">
                    Área *
                  </Label>
                  <Select value={dados.area} onValueChange={(value) => setDados({ ...dados, area: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                      {areas.map((area) => (
                        <SelectItem key={area} value={area} className="hover:bg-white/10">
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade e Estado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cidade" className="text-white drop-shadow-sm">
                      Cidade *
                    </Label>
                    <Select value={dados.cidade} onValueChange={(value) => setDados({ ...dados, cidade: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                        {cidades.map((cidade) => (
                          <SelectItem key={cidade} value={cidade} className="hover:bg-white/10">
                            {cidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado" className="text-white drop-shadow-sm">
                      Estado *
                    </Label>
                    <Select value={dados.estado} onValueChange={(value) => setDados({ ...dados, estado: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                        {estados.map((estado) => (
                          <SelectItem key={estado} value={estado} className="hover:bg-white/10">
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo Contrato e Modalidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipoContrato" className="text-white drop-shadow-sm">
                      Tipo Contrato *
                    </Label>
                    <Select value={dados.tipoContrato} onValueChange={(value) => setDados({ ...dados, tipoContrato: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                        {tiposContrato.map((tipo) => (
                          <SelectItem key={tipo} value={tipo} className="hover:bg-white/10">
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modalidade" className="text-white drop-shadow-sm">
                      Modalidade *
                    </Label>
                    <Select value={dados.modalidade} onValueChange={(value) => setDados({ ...dados, modalidade: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                        {modalidades.map((modalidade) => (
                          <SelectItem key={modalidade} value={modalidade} className="hover:bg-white/10">
                            {modalidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Faixa salarial e Jornada */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salarioMin" className="text-white drop-shadow-sm">
                      Salário mínimo (R$)
                    </Label>
                    <Input
                      id="salarioMin"
                      value={dados.salarioMin}
                      onChange={(e) => setDados({ ...dados, salarioMin: e.target.value })}
                      placeholder="Ex: 3000"
                      type="number"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salarioMax" className="text-white drop-shadow-sm">
                      Salário máximo (R$)
                    </Label>
                    <Input
                      id="salarioMax"
                      value={dados.salarioMax}
                      onChange={(e) => setDados({ ...dados, salarioMax: e.target.value })}
                      placeholder="Ex: 5000"
                      type="number"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jornada" className="text-white drop-shadow-sm">
                      Jornada
                    </Label>
                    <Select value={dados.jornada} onValueChange={(value) => setDados({ ...dados, jornada: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                        {jornadas.map((jornada) => (
                          <SelectItem key={jornada} value={jornada} className="hover:bg-white/10">
                            {jornada}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status da Vaga */}
                <div className="space-y-3">
                  <Label className="text-white drop-shadow-sm">Status da Vaga</Label>
                  <RadioGroup value={dados.status} onValueChange={(value: StatusVaga) => setDados({ ...dados, status: value })}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-all duration-200">
                      <RadioGroupItem value="ativa" id="status-ativa" className="border-white/40 text-white" />
                      <Label htmlFor="status-ativa" className="text-white drop-shadow-sm cursor-pointer flex-1">
                        Ativa (aceita candidaturas)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-all duration-200">
                      <RadioGroupItem value="inativa" id="status-inativa" className="border-white/40 text-white" />
                      <Label htmlFor="status-inativa" className="text-white drop-shadow-sm cursor-pointer flex-1">
                        Inativa (não aceita candidaturas)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-all duration-200">
                      <RadioGroupItem value="rascunho" id="status-rascunho" className="border-white/40 text-white" />
                      <Label htmlFor="status-rascunho" className="text-white drop-shadow-sm cursor-pointer flex-1">
                        Rascunho (não publicada)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: LANDING PAGE */}
          <TabsContent value="landing-page" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-white/80 drop-shadow-sm">Conteúdo da página pública da vaga</p>
                </div>

                {/* Nome da Vaga */}
                <div className="space-y-2">
                  <Label className="text-white drop-shadow-sm">Nome da Vaga *</Label>
                  <RichTextEditor
                    content={dados.nomeVaga}
                    onChange={(value) => setDados({ ...dados, nomeVaga: value })}
                    placeholder="Ex: Assistente Odontológico"
                    minHeight={100}
                  />
                </div>

                {/* O que você vai fazer */}
                <div className="space-y-2">
                  <Label className="text-white drop-shadow-sm">O que você vai fazer *</Label>
                  <RichTextEditor
                    content={dados.oQueVoceFaz}
                    onChange={(value) => setDados({ ...dados, oQueVoceFaz: value })}
                    placeholder="Descreva de forma clara e objetiva as atividades do dia a dia..."
                    minHeight={150}
                  />
                </div>

                {/* Suas principais responsabilidades */}
                <div className="space-y-2">
                  <Label className="text-white drop-shadow-sm">Suas principais responsabilidades *</Label>
                  <RichTextEditor
                    content={dados.responsabilidades}
                    onChange={(value) => setDados({ ...dados, responsabilidades: value })}
                    placeholder="Liste as principais responsabilidades da função..."
                    minHeight={150}
                  />
                </div>

                <div className="border-t border-white/20 pt-6">
                  <h3 className="text-white drop-shadow-md mb-6">O que você precisa ter *</h3>

                  {/* Formação */}
                  <div className="space-y-2 mb-6">
                    <Label className="text-white drop-shadow-sm">Formação *</Label>
                    <RichTextEditor
                      content={dados.formacao}
                      onChange={(value) => setDados({ ...dados, formacao: value })}
                      placeholder="Ex: Superior completo em Odontologia, Curso técnico em..."
                      minHeight={100}
                    />
                  </div>

                  {/* Experiência */}
                  <div className="space-y-2 mb-6">
                    <Label className="text-white drop-shadow-sm">Experiência *</Label>
                    <RichTextEditor
                      content={dados.experiencia}
                      onChange={(value) => setDados({ ...dados, experiencia: value })}
                      placeholder="Ex: Mínimo 2 anos de experiência em..."
                      minHeight={100}
                    />
                  </div>

                  {/* Conhecimentos Técnicos */}
                  <div className="space-y-2 mb-6">
                    <Label className="text-white drop-shadow-sm">Conhecimentos Técnicos *</Label>
                    <RichTextEditor
                      content={dados.conhecimentosTecnicos}
                      onChange={(value) => setDados({ ...dados, conhecimentosTecnicos: value })}
                      placeholder="Ex: Conhecimento em radiologia, esterilização de materiais..."
                      minHeight={100}
                    />
                  </div>

                  {/* Habilidades Essenciais */}
                  <div className="space-y-2">
                    <Label className="text-white drop-shadow-sm">Habilidades Essenciais *</Label>
                    <RichTextEditor
                      content={dados.habilidadesEssenciais}
                      onChange={(value) => setDados({ ...dados, habilidadesEssenciais: value })}
                      placeholder="Ex: Boa comunicação, empatia, trabalho em equipe..."
                      minHeight={100}
                    />
                  </div>
                </div>

                <div className="border-t border-white/20 pt-6 space-y-6">
                  {/* Você é a pessoa certa se */}
                  <div className="space-y-2">
                    <Label className="text-white drop-shadow-sm">Você é a pessoa certa para este cargo se *</Label>
                    <RichTextEditor
                      content={dados.pessoaCerta}
                      onChange={(value) => setDados({ ...dados, pessoaCerta: value })}
                      placeholder="Descreva o perfil ideal da pessoa que vai se destacar nesta vaga..."
                      minHeight={150}
                    />
                  </div>

                  {/* Diferenciais */}
                  <div className="space-y-2">
                    <Label className="text-white drop-shadow-sm">Seria incrível se você também tivesse</Label>
                    <RichTextEditor
                      content={dados.diferenciais}
                      onChange={(value) => setDados({ ...dados, diferenciais: value })}
                      placeholder="Requisitos desejáveis mas não obrigatórios..."
                      minHeight={150}
                    />
                  </div>
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: PERGUNTAS DE TRIAGEM */}
          <TabsContent value="triagem" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-6">
                <p className="text-white/80 drop-shadow-sm">
                  Adicione perguntas de triagem para filtrar candidatos:
                </p>

                {dados.perguntasTriagem.map((pergunta, index) => (
                  <Glass key={pergunta.id} variant="white" blur="sm" className="p-6 rounded-lg space-y-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-white drop-shadow-sm">Pergunta {index + 1}</h4>
                      <GlassButton
                        variant="white"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoverPergunta('triagem', pergunta.id);
                        }}
                        className="text-red-400 hover:text-red-300 -mt-2"
                      >
                        <X className="w-4 h-4" />
                      </GlassButton>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">A pergunta</Label>
                      <Input
                        value={pergunta.pergunta}
                        onChange={(e) => handleUpdatePergunta('triagem', pergunta.id, 'pergunta', e.target.value)}
                        placeholder="Digite a pergunta..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Ajuda/Instruções</Label>
                      <Input
                        value={pergunta.ajuda}
                        onChange={(e) => handleUpdatePergunta('triagem', pergunta.id, 'ajuda', e.target.value)}
                        placeholder="Texto com instruções de como responder..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Tipo</Label>
                      <Select
                        value={pergunta.tipo}
                        onValueChange={(value: TipoPergunta) =>
                          handleUpdatePergunta('triagem', pergunta.id, 'tipo', value)
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                          {tiposPergunta.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value} className="hover:bg-white/10">
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campo de Opções - aparece apenas para única/múltipla escolha */}
                    {(pergunta.tipo === 'unica-escolha' || pergunta.tipo === 'multipla-escolha') && (
                      <div className="space-y-2">
                        <Label className="text-white/90 drop-shadow-sm text-sm">
                          Opções (separe por ponto e vírgula)
                        </Label>
                        <Input
                          value={pergunta.opcoes || ''}
                          onChange={(e) => handleUpdatePergunta('triagem', pergunta.id, 'opcoes', e.target.value)}
                          placeholder="Ex: Sim; Não; Talvez"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <p className="text-white/60 drop-shadow-sm text-xs">
                          Exemplo: Opção 1; Opção 2; Opção 3
                        </p>
                      </div>
                    )}
                  </Glass>
                ))}

                <div className="flex flex-col gap-3">
                  <GlassButton
                    variant="white"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAdicionarPergunta('triagem');
                    }}
                    className="w-full justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                  </GlassButton>

                  <div className="text-center text-white/60 drop-shadow-sm">OU</div>

                  <GlassButton 
                    variant="white" 
                    className="w-full justify-center"
                    onClick={(e) => e.preventDefault()}
                  >
                    📚 Usar da Biblioteca
                  </GlassButton>
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: PERGUNTAS DE CULTURA */}
          <TabsContent value="cultura" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-6">
                <p className="text-white/80 drop-shadow-sm">
                  Adicione perguntas sobre cultura organizacional:
                </p>

                {dados.perguntasCultura.map((pergunta, index) => (
                  <Glass key={pergunta.id} variant="white" blur="sm" className="p-6 rounded-lg space-y-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-white drop-shadow-sm">Pergunta {index + 1}</h4>
                      <GlassButton
                        variant="white"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoverPergunta('cultura', pergunta.id);
                        }}
                        className="text-red-400 hover:text-red-300 -mt-2"
                      >
                        <X className="w-4 h-4" />
                      </GlassButton>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">A pergunta</Label>
                      <Input
                        value={pergunta.pergunta}
                        onChange={(e) => handleUpdatePergunta('cultura', pergunta.id, 'pergunta', e.target.value)}
                        placeholder="Digite a pergunta..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Ajuda/Instruções</Label>
                      <Input
                        value={pergunta.ajuda}
                        onChange={(e) => handleUpdatePergunta('cultura', pergunta.id, 'ajuda', e.target.value)}
                        placeholder="Texto com instruções de como responder..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Tipo</Label>
                      <Select
                        value={pergunta.tipo}
                        onValueChange={(value: TipoPergunta) =>
                          handleUpdatePergunta('cultura', pergunta.id, 'tipo', value)
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                          {tiposPergunta.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value} className="hover:bg-white/10">
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campo de Opções - aparece apenas para única/múltipla escolha */}
                    {(pergunta.tipo === 'unica-escolha' || pergunta.tipo === 'multipla-escolha') && (
                      <div className="space-y-2">
                        <Label className="text-white/90 drop-shadow-sm text-sm">
                          Opções (separe por ponto e vírgula)
                        </Label>
                        <Input
                          value={pergunta.opcoes || ''}
                          onChange={(e) => handleUpdatePergunta('cultura', pergunta.id, 'opcoes', e.target.value)}
                          placeholder="Ex: Sim; Não; Talvez"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <p className="text-white/60 drop-shadow-sm text-xs">
                          Exemplo: Opção 1; Opção 2; Opção 3
                        </p>
                      </div>
                    )}
                  </Glass>
                ))}

                <div className="flex flex-col gap-3">
                  <GlassButton
                    variant="white"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAdicionarPergunta('cultura');
                    }}
                    className="w-full justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                  </GlassButton>

                  <div className="text-center text-white/60 drop-shadow-sm">OU</div>

                  <GlassButton 
                    variant="white" 
                    className="w-full justify-center"
                    onClick={(e) => e.preventDefault()}
                  >
                    📚 Usar da Biblioteca
                  </GlassButton>
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: IA */}
          <TabsContent value="ia" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white drop-shadow-sm">
                    Instruções para Análise da IA
                  </Label>
                  <p className="text-white/60 drop-shadow-sm text-sm mb-4">
                    Cole abaixo instruções e explicações sobre a vaga para que a IA possa fazer análises mais precisas dos candidatos.
                  </p>
                  <Textarea
                    value={dados.instrucoesIA}
                    onChange={(e) => setDados({ ...dados, instrucoesIA: e.target.value })}
                    placeholder="Ex: Esta vaga é para um assistente que trabalhará diretamente com o dentista durante procedimentos. É fundamental que o candidato tenha experiência em radiologia e saiba trabalhar sob pressão..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[300px]"
                  />
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: AVALIAÇÃO (M2 — Phase 7: Template + Pesos + Tag Wizard) */}
          <TabsContent value="config" className="mt-0">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <div className="space-y-12">
                {/* Bloco 1 — Template de cargo */}
                <TemplateVagaSelector
                  selectedSlug={selectedTemplate}
                  onSelect={handleSelectTemplate}
                />

                {/* Bloco 2 — Pesos de avaliação */}
                <PesosSliders value={pesos} onChange={setPesos} />

                {/* Bloco 3 — Assistente de tags (Tag Wizard).
                    O banco de perguntas SJT é entregue na Phase 11 (D-05); aqui
                    exibimos o estado vazio do assistente. */}
                <div className="rounded-xl border border-white/20 bg-white/10 p-6 space-y-1">
                  <p className="text-white drop-shadow-sm text-base font-semibold">
                    Nenhuma pergunta de escolha nesta vaga
                  </p>
                  <p className="text-white/60 drop-shadow-sm text-sm">
                    O assistente de tags aparece só para perguntas de escolha
                    única ou múltipla. Adicione perguntas na aba Perguntas para
                    marcá-las aqui.
                  </p>
                </div>

                {/* Estado de publicação (Pitfall 5 — status_vaga tem 4 valores). */}
                {dbStatus !== 'rascunho' && (
                  <div className="rounded-xl border border-white/20 bg-white/10 p-6">
                    <p className="text-white/80 drop-shadow-sm text-sm">
                      Esta vaga já está {dbStatus} — a publicação não se aplica.
                      Use o status na aba Informações para alterá-la.
                    </p>
                  </div>
                )}
              </div>
            </Glass>
          </TabsContent>
        </Tabs>
      </div>

      {/* RODAPÉ FIXO */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Glass variant="white" blur="lg" className="p-4 border-t border-white/20">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <GlassButton 
              variant="white" 
              onClick={(e) => {
                e.preventDefault();
                handleCancelar();
              }}
            >
              Cancelar
            </GlassButton>
            <div className="flex gap-3">
              <GlassButton
                variant="white"
                disabled={updateVagaConfigMut.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void handleSalvarRascunho();
                }}
              >
                Salvar Rascunho
              </GlassButton>
              {/* FUNIL-04: edit-path primary CTA — persists base fields +
                  status radio + config in one action. */}
              {isEdicao && (
                <GlassButton
                  variant="accent"
                  disabled={isSavingBase}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleSalvarAlteracoes();
                  }}
                >
                  Salvar alterações
                </GlassButton>
              )}
              {/* Pitfall 5: Publicar só renderiza para vagas em rascunho.
                  status_vaga tem 4 valores (rascunho/ativa/inativa/arquivada) e o
                  RPC publish_vaga só transiciona rascunho→ativa. */}
              {dbStatus === 'rascunho' ? (
                <GlassButton
                  variant="accent"
                  disabled={publishVagaMut.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    void handlePublicar();
                  }}
                >
                  Publicar vaga →
                </GlassButton>
              ) : (
                <span className="text-white/70 drop-shadow-sm text-sm self-center px-2">
                  Vaga {dbStatus} — publicação não se aplica
                </span>
              )}
            </div>
          </div>
        </Glass>
      </div>
    </RHLayout>
  );
}
