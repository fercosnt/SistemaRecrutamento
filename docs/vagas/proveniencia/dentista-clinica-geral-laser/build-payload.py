#!/usr/bin/env python3
"""Payload da vaga de dentista. Fonte: o texto da vaga antiga que o operador colou (2026-10-15) e as
decisoes dele na rodada de perguntas. `sobre_empresa` e a secao de links sao EXTRAIDOS do payload da
vaga de SDR (mesmo texto institucional), nunca transcritos.
    python3 -I build-payload.py <repo> <saida.json>"""
import json, sys, os
repo, saida = sys.argv[1:3]
sdr = json.load(open(os.path.join(repo, 'docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json')))

sobre_cargo = """Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Estamos buscando um(a) cirurgião(ã)-dentista para a clínica geral de adultos: quem executa os tratamentos e os protocolos de laser da clínica, com rigor técnico e cuidado com o paciente.

**O seu papel.** A avaliação do paciente e a apresentação do plano de tratamento ficam com o Dr. Fernando. Você executa o plano: conduz as sessões, acompanha a evolução e orienta o paciente. Dúvidas sobre o plano ou sobre valores, você leva ao Dr. Fernando e à equipe.

**Laser sem experiência prévia.** Não exigimos experiência com laser. Você aprende os protocolos no Centro de Excelência Beauty Smile, com a equipe clínica, antes de aplicá-los.

**O que a clínica não faz.** Não fazemos harmonização orofacial nem estética facial.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia de atendimento, um caso escrito e uma redação curta. Depois, entrevista com a equipe clínica."""

responsabilidades = """- **Atendimento clínico.** Realizar consultas e tratamentos odontológicos preventivos e corretivos em adultos, seguindo o protocolo padrão da clínica.
- **Protocolos de laser.** Aplicar os protocolos com o laser Fotona nas diversas especialidades, depois do treinamento no Centro de Excelência Beauty Smile.
- **Execução do plano.** Conduzir as sessões do plano definido na avaliação e acompanhar a evolução do paciente de sessão em sessão.
- **Orientação ao paciente.** Explicar o que vai ser feito em cada sessão, orientar cuidados preventivos e de higiene, e encaminhar as dúvidas comerciais à equipe.
- **Qualidade e segurança.** Seguir as normas de biossegurança, manter o prontuário completo e o ambiente organizado.
- **Equipe.** Trabalhar de forma integrada com a equipe multidisciplinar e contribuir para a melhoria contínua dos protocolos da clínica."""

requisitos_formacao = "Graduação em Odontologia e **inscrição ativa no CRO-SP**. Especialização em qualquer área da odontologia conta pontos."

requisitos_experiencia = """Experiência em clínica geral com pacientes adultos. Não exigimos tempo mínimo.

**Contam pontos:** atendimento em clínicas multidisciplinares de alto padrão; experiência com pacientes ansiosos ou com medo de dentista."""

requisitos_tecnicos = """Procedimentos de clínica geral em adultos; biossegurança; prontuário completo.

**Contam pontos:** laser odontológico; escaneamento intraoral e radiologia digital; cursos de laser, odontologia digital ou minimamente invasiva. Experiência com laser não é exigida — a clínica treina."""

requisitos_habilidades = """- **Rigor com protocolo** — segue o fluxo clínico definido e propõe melhorias pelo caminho certo.
- **Comunicação com o paciente** — explica sem jargão e lida com perfis diferentes, inclusive quem tem medo.
- **Trabalho em equipe** — atua junto com auxiliares, especialistas e a coordenação clínica.
- **Atualização contínua** — busca formação por conta própria.
- **Ética profissional** — recusa o que não tem indicação, mesmo quando o paciente insiste."""

diferenciais = """- Especialização em áreas da odontologia.
- Experiência em clínicas multidisciplinares de alto padrão.
- Experiência ou interesse comprovado em tecnologias odontológicas de ponta: laser, escaneamento 3D, radiologia digital.
- Cursos complementares em laser odontológico ou novas tecnologias.
- Visão voltada para a odontologia digital e minimamente invasiva."""

beneficios = """Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.** Os valores são combinados na entrevista.
- **Capacitação** nos protocolos de laser no Centro de Excelência Beauty Smile.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte. Eles valem para o quadro CLT, e esta vaga é PJ."""

perfil_ideal = ("Dentista de clínica geral de adultos que executa bem um plano feito pelo Dr. Fernando e cuida da "
    "experiência do paciente em cada sessão: explica o que vai fazer, acolhe quem tem medo, combina cuidados em casa e "
    "acompanha a evolução. Segue protocolo e biossegurança sob pressão de agenda e não fala de preço com o paciente. "
    "Na entrevista, sondar: um paciente com medo que ele conduziu; algo que fez por um paciente sem ele pedir; como organiza "
    "a primeira sessão de um paciente novo; quando discordou de um protocolo e como encaminhou. Como não há "
    "tempo mínimo de clínica, investigar a prática real por trás do currículo. Riscos: quem promete resultado, quem "
    "trata o paciente como dente e não como gente, e quem prefere seguir só a própria experiência.")

perguntas = [
    dict(bloco='curriculo', ordem=1, texto_pergunta='Qual é a sua situação no Conselho Regional de Odontologia?', texto_ajuda=None,
         tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         opcoes_resposta=['Tenho inscrição ativa no CRO-SP',
                          'Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de começar',
                          'Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP',
                          'Ainda não tenho registro ativo no CRO'],
         knockout_proposto=['Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP',
                            'Ainda não tenho registro ativo no CRO']),
    dict(bloco='valores', ordem=2, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Você está ciente de que a Beauty Smile não realiza harmonização orofacial nem estética facial?',
         opcoes_resposta=['Sim, estou ciente de que a clínica não realiza harmonização orofacial nem estética facial',
                          'Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial'],
         knockout_proposto=['Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial']),
    dict(bloco='jornada', ordem=3, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?',
         opcoes_resposta=['Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica',
                          'Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída',
                          'Tenho disponibilidade apenas em alguns dias ou turnos, porque atendo em outro lugar']),
    dict(bloco='curriculo', ordem=4, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Qual é o seu tempo total de experiência clínica?',
         opcoes_resposta=['Menos de 2 anos de experiência clínica', 'Entre 2 e 5 anos de experiência clínica',
                          'Entre 5 e 10 anos de experiência clínica', 'Mais de 10 anos de experiência clínica']),
    dict(bloco='curriculo', ordem=5, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Em quais áreas você tem especialização concluída ou em andamento?',
         texto_ajuda='Marque as concluídas e as que está cursando.',
         opcoes_resposta=['Especialização em Dentística', 'Especialização em Endodontia', 'Especialização em Implantodontia',
                          'Especialização em Ortodontia', 'Especialização em Periodontia', 'Especialização em Prótese',
                          'Especialização em Radiologia', 'Especialização em Odontopediatria',
                          'Especialização em Harmonização orofacial', 'Não tenho especialização concluída nem em andamento']),
    dict(bloco='curriculo', ordem=6, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Em quais procedimentos você tem mais experiência? Selecione até 3.',
         opcoes_resposta=['Tratamentos restauradores e estéticos', 'Endodontia', 'Periodontia', 'Cirurgias orais menores',
                          'Implantodontia', 'Próteses', 'Ortodontia', 'Odontopediatria', 'Outros procedimentos']),
    dict(bloco='tecnologia', ordem=7, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Com quais destas tecnologias odontológicas você tem experiência?',
         opcoes_resposta=['Scanner intraoral', 'Radiografia digital', 'Microscópio operatório', 'CAD/CAM', 'Laser odontológico',
                          'Fotografia odontológica', 'Impressão 3D', 'Planejamento digital', 'Nenhuma destas tecnologias']),
    dict(bloco='tecnologia', ordem=8, tipo_resposta='texto_curto', obrigatoria=False, limite_caracteres=500, opcoes_resposta=None,
         texto_pergunta='Você já usou laser na odontologia? Se sim, conte para qual tratamento e com qual equipamento.',
         texto_ajuda='Se nunca usou, tudo bem: a clínica treina. Pode deixar em branco.'),
    dict(bloco='valores', ordem=9, texto_ajuda=None, tipo_resposta='single_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Em relação a protocolos clínicos estabelecidos, qual frase mais se parece com você?',
         opcoes_resposta=['Sigo os protocolos à risca, sem exceções',
                          'Adapto os protocolos conforme a necessidade do caso, mas mantenho a essência deles',
                          'Prefiro desenvolver meus próprios protocolos, baseados em evidências científicas',
                          'Sigo os protocolos quando é conveniente, mas priorizo a minha experiência clínica']),
    dict(bloco='valores', ordem=10, texto_ajuda=None, tipo_resposta='multiple_choice', obrigatoria=True, limite_caracteres=None,
         texto_pergunta='Quais destas ações você costuma incorporar na sua rotina de atendimento?',
         opcoes_resposta=['Entro em contato com o paciente no dia seguinte a procedimentos mais invasivos',
                          'Personalizo o ambiente conforme as preferências do paciente',
                          'Ofereço opções adicionais de conforto durante o tratamento',
                          'Reservo tempo extra para responder a todas as dúvidas do paciente',
                          'Preparo materiais educativos personalizados para o paciente',
                          'Guardo detalhes pessoais do paciente para retomar na próxima consulta',
                          'Comemoro marcos e resultados do tratamento com o paciente',
                          'Antecipo necessidades do paciente antes que ele peça']),
]
for q in perguntas:
    ko = q.pop('knockout_proposto', None)
    if ko:
        q['opcoes_metadata'] = [dict(opcao_texto=t, tag=('knockout' if t in ko else 'neutro'), ordem=i + 1)
                                for i, t in enumerate(q['opcoes_resposta'])]

payload = {
    'autor_email': 'fernando@beautysmile.com.br',
    '_proveniencia': 'texto da vaga antiga colado pelo operador em 2026-10-15 + decisoes da rodada de perguntas; sobre_empresa e secao de links extraidos do payload da vaga de SDR',
    'vaga': dict(
        slug='dentista-clinica-geral-laser', titulo='Cirurgião(ã)-Dentista — Clínica Geral',
        subtitulo='Clínica geral de adultos com o laser Fotona LightWalker · PJ presencial · unidade Paraíso',
        descricao_curta='Atendimento clínico geral de adultos com o laser Fotona LightWalker, seguindo o protocolo da clínica e com treinamento no Centro de Excelência Beauty Smile. PJ, presencial no Paraíso, em São Paulo.',
        departamento='Clínico', tipo_contrato='PJ', modelo_trabalho='Presencial', cidade='São Paulo', estado='SP',
        endereco_completo='Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP',
        jornada_trabalho='Segunda a sexta, das 9h às 19h, presencial',
        faixa_salarial_min=None, faixa_salarial_max=None, exibir_salario=False, total_vagas=1, aplica_cognitivo=False,
        sobre_cargo=sobre_cargo, responsabilidades=responsabilidades, requisitos_formacao=requisitos_formacao,
        requisitos_experiencia=requisitos_experiencia, requisitos_tecnicos=requisitos_tecnicos,
        requisitos_habilidades=requisitos_habilidades, diferenciais=diferenciais, beneficios=beneficios,
        sobre_empresa=sdr['vaga']['sobre_empresa'], perfil_ideal=perfil_ideal),
    '_resolvidos_no_apply': {'data_abertura': 'data do apply, fuso America/Sao_Paulo', 'data_fechamento': None},
    'secoes_extras': [s for s in sdr['secoes_extras'] if s['titulo'] == 'Conheça a Beauty Smile'],
    'template_cargo': 'dentista',
    'pesos_avaliacao': {'triagem': 20, 'work_sample_sjt': 35, 'redacao_cultural': 15, 'entrevista': 30},
    'testes_aplicaveis': [
        {'teste': 'triagem', 'obrigatorio': True, 'customizado': False},
        {'teste': 'work_sample_sjt', 'obrigatorio': True, 'customizado': False, 'cargo': 'dentista'},
        {'teste': 'redacao_cultural', 'obrigatorio': True, 'customizado': False, 'codigos': ['DENT_UAU']},
        {'teste': 'big_five', 'obrigatorio': False, 'customizado': False},
        {'teste': 'cognitivo', 'obrigatorio': False, 'customizado': False},
        {'teste': 'entrevista', 'obrigatorio': True, 'customizado': False}],
    'redacoes_novas': [dict(codigo='DENT_UAU', texto='Descreva uma situação específica em que você superou as expectativas de um paciente, proporcionando uma experiência memorável que foi além do tratamento odontológico convencional. O que você fez de diferente e qual foi o resultado?', template_cargo='dentista_padrao',
                            valor_primario='uau', valor_secundario='atitude_de_dono', is_padrao=False, default_on=False)],
    'rubrica_ia': open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rubrica.md'), encoding='utf-8').read().strip(),
    'perguntas': perguntas,
}
assert len(perfil_ideal) <= 800, len(perfil_ideal)
json.dump(payload, open(saida, 'w'), ensure_ascii=False, indent=2)
print('ok', saida, 'perfil_ideal', len(perfil_ideal))
