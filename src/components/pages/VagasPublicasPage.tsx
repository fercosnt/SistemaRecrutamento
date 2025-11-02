import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassButton, GlassCard } from '../ui/glass';
import { MapPin, Briefcase, Clock, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Vaga {
  id: number;
  titulo: string;
  area: string;
  cidade: string;
  estado: string;
  tipoContrato: string;
  modalidade: string;
  descricao: string;
}

export function VagasPublicasPage() {
  const [buscaVaga, setBuscaVaga] = useState('');
  const [filtroArea, setFiltroArea] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCidade, setFiltroCidade] = useState('todas');

  // Mock data - vagas ativas
  const vagas: Vaga[] = [
    {
      id: 1,
      titulo: 'Assistente Odontológico',
      area: 'Odontologia',
      cidade: 'São Paulo',
      estado: 'SP',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      descricao: 'Buscamos profissional para auxiliar em procedimentos odontológicos e atendimento ao paciente.',
    },
    {
      id: 2,
      titulo: 'Recepcionista',
      area: 'Atendimento',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      descricao: 'Profissional para atendimento ao cliente, agendamentos e gestão de recepção.',
    },
    {
      id: 3,
      titulo: 'Auxiliar Administrativo',
      area: 'Administrativo',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      descricao: 'Apoio em atividades administrativas, controle de documentos e atendimento interno.',
    },
    {
      id: 4,
      titulo: 'Dentista Clínico Geral',
      area: 'Odontologia',
      cidade: 'São Paulo',
      estado: 'SP',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      descricao: 'Dentista para atendimento clínico geral com foco em excelência no atendimento.',
    },
    {
      id: 5,
      titulo: 'Analista Financeiro',
      area: 'Financeiro',
      cidade: 'São Paulo',
      estado: 'SP',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      descricao: 'Profissional para análise financeira, contas a pagar/receber e relatórios gerenciais.',
    },
    {
      id: 6,
      titulo: 'Especialista em Implantes',
      area: 'Odontologia',
      cidade: 'Porto Alegre',
      estado: 'RS',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      descricao: 'Cirurgião-dentista especializado em implantodontia para atendimento especializado.',
    },
    {
      id: 7,
      titulo: 'Técnico de TI',
      area: 'Tecnologia',
      cidade: 'São Paulo',
      estado: 'SP',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      descricao: 'Suporte técnico, manutenção de equipamentos e infraestrutura de TI.',
    },
    {
      id: 8,
      titulo: 'Coordenador de Marketing',
      area: 'Marketing',
      cidade: 'São Paulo',
      estado: 'SP',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      descricao: 'Coordenação de estratégias de marketing digital e comunicação institucional.',
    },
    {
      id: 9,
      titulo: 'Ortodontista',
      area: 'Odontologia',
      cidade: 'Curitiba',
      estado: 'PR',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      descricao: 'Especialista em ortodontia para atendimento de pacientes com aparelhos ortodônticos.',
    },
    {
      id: 10,
      titulo: 'Gerente de Clínica',
      area: 'Gestão',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      descricao: 'Gestão completa de clínica odontológica, equipe e processos operacionais.',
    },
  ];

  // Extrair listas únicas para os filtros
  const areas = ['todas', ...Array.from(new Set(vagas.map(v => v.area)))];
  const estados = ['todos', ...Array.from(new Set(vagas.map(v => v.estado)))];
  const cidades = ['todas', ...Array.from(new Set(vagas.map(v => v.cidade)))];

  // Aplicar filtros
  const vagasFiltradas = vagas.filter((vaga) => {
    const passaBuscaVaga = buscaVaga === '' || vaga.titulo.toLowerCase().includes(buscaVaga.toLowerCase());
    const passaArea = filtroArea === 'todas' || vaga.area === filtroArea;
    const passaEstado = filtroEstado === 'todos' || vaga.estado === filtroEstado;
    const passaCidade = filtroCidade === 'todas' || vaga.cidade === filtroCidade;

    return passaBuscaVaga && passaArea && passaEstado && passaCidade;
  });

  const handleCandidatar = (vaga: Vaga) => {
    console.log('Candidatar-se à vaga:', vaga.id);
    // Aqui seria a navegação para o formulário de candidatura
  };

  const limparFiltros = () => {
    setBuscaVaga('');
    setFiltroArea('todas');
    setFiltroEstado('todos');
    setFiltroCidade('todas');
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient" 
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-6" />
            <h1 className="text-white text-5xl mb-3 drop-shadow-lg">Vagas Disponíveis</h1>
            <p className="text-white/90 text-xl drop-shadow-md">
              Faça parte do time Beauty Smile
            </p>
          </div>

          {/* Filtros */}
          <Glass variant="white" blur="xl" className="p-6 rounded-xl">
            <div className="space-y-4">
              {/* Busca por vaga */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Buscar por vaga..."
                  value={buscaVaga}
                  onChange={(e) => setBuscaVaga(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                />
              </div>

              {/* Filtros dropdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Área */}
                <Select value={filtroArea} onValueChange={setFiltroArea}>
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {areas.map((area) => (
                      <SelectItem 
                        key={area} 
                        value={area}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {area === 'todas' ? 'Todas as áreas' : area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Estado */}
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {estados.map((estado) => (
                      <SelectItem 
                        key={estado} 
                        value={estado}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {estado === 'todos' ? 'Todos os estados' : estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Cidade */}
                <Select value={filtroCidade} onValueChange={setFiltroCidade}>
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {cidades.map((cidade) => (
                      <SelectItem 
                        key={cidade} 
                        value={cidade}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {cidade === 'todas' ? 'Todas as cidades' : cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resultados e botão limpar */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-white drop-shadow-sm">
                  <span className="text-white/80">Resultados:</span>
                  <span className="ml-3">{vagasFiltradas.length} {vagasFiltradas.length === 1 ? 'vaga' : 'vagas'}</span>
                </div>
                {(buscaVaga || filtroArea !== 'todas' || filtroEstado !== 'todos' || filtroCidade !== 'todas') && (
                  <GlassButton 
                    variant="white" 
                    className="text-white drop-shadow-sm"
                    onClick={limparFiltros}
                  >
                    Limpar filtros
                  </GlassButton>
                )}
              </div>
            </div>
          </Glass>

          {/* Lista de vagas */}
          {vagasFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {vagasFiltradas.map((vaga) => (
                <GlassCard 
                  key={vaga.id} 
                  variant="white" 
                  blur="xl" 
                  hover 
                  className="text-white transition-all duration-300"
                >
                  <div className="space-y-6">
                    {/* Header da vaga */}
                    <div>
                      <h2 className="text-3xl mb-3 drop-shadow-md">{vaga.titulo}</h2>
                      <div className="flex flex-wrap gap-4 text-white/80 drop-shadow-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          <span>{vaga.cidade}, {vaga.estado}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          <span>{vaga.area}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          <span>{vaga.modalidade}</span>
                        </div>
                      </div>
                    </div>

                    {/* Descrição */}
                    <Glass variant="white" blur="md" className="p-4 rounded-lg">
                      <p className="text-white/90 drop-shadow-sm">{vaga.descricao}</p>
                    </Glass>

                    {/* Botão de candidatura */}
                    <div className="pt-2">
                      <GlassButton 
                        variant="white" 
                        hover 
                        className="w-full py-4 text-white drop-shadow-sm transition-all duration-200"
                        onClick={() => handleCandidatar(vaga)}
                      >
                        Candidatar-se a esta vaga →
                      </GlassButton>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <Glass variant="white" blur="xl" className="p-12 rounded-xl text-center">
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-white text-2xl drop-shadow-md">Nenhuma vaga encontrada</h3>
                <p className="text-white/80 drop-shadow-sm">
                  Tente ajustar os filtros para encontrar mais oportunidades
                </p>
                <GlassButton 
                  variant="white" 
                  hover
                  className="text-white drop-shadow-sm mt-4"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </GlassButton>
              </div>
            </Glass>
          )}
        </div>
      </BackgroundImage>
    </div>
  );
}
