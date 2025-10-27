import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Separator } from './components/ui/separator';
import { Skeleton } from './components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { ScrollArea } from './components/ui/scroll-area';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Heart, 
  CheckCircle2, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  FileText,
  Search,
  LayoutDashboard,
  Users,
  BriefcaseIcon,
  ChevronRight,
  Menu,
  LogOut,
  Settings,
  BarChart3,
  Target,
  Award,
  Brain,
  MessageSquare,
  Download,
  Navigation,
  Clipboard,
  TestTube,
  BookOpen,
  Building2,
  UserPlus
} from 'lucide-react';
import { toast, Toaster } from 'sonner@2.0.3';

type Page = 
  | 'job-landing' 
  | 'application-form' 
  | 'test-instructions'
  | 'test-bigfive'
  | 'test-disc'
  | 'test-intelligence'
  | 'test-complete'
  | 'manifesto'
  | 'culture-questions'
  | 'login'
  | 'dashboard'
  | 'candidates'
  | 'candidate-profile'
  | 'create-job';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('job-landing');
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setNavOpen(false);
    window.scrollTo(0, 0);
  };

  // Navigation Menu Component
  const NavigationMenu = () => {
    const menuSections = [
      {
        title: '👥 Área do Candidato',
        icon: Users,
        pages: [
          { id: 'job-landing' as Page, label: 'Landing Page da Vaga', icon: Briefcase },
          { id: 'application-form' as Page, label: 'Formulário de Candidatura', icon: Clipboard },
          { id: 'test-instructions' as Page, label: 'Instruções do Teste', icon: BookOpen },
          { id: 'test-bigfive' as Page, label: 'Teste Big Five', icon: Brain },
          { id: 'test-disc' as Page, label: 'Teste DISC', icon: TestTube },
          { id: 'test-intelligence' as Page, label: 'Teste de Inteligência', icon: Award },
          { id: 'test-complete' as Page, label: 'Teste Concluído', icon: CheckCircle2 },
          { id: 'manifesto' as Page, label: 'Manifesto Institucional', icon: FileText },
          { id: 'culture-questions' as Page, label: 'Perguntas de Cultura', icon: MessageSquare },
        ]
      },
      {
        title: '🏢 Área Administrativa (RH)',
        icon: Building2,
        pages: [
          { id: 'login' as Page, label: 'Login', icon: LogOut },
          { id: 'dashboard' as Page, label: 'Dashboard Home', icon: LayoutDashboard },
          { id: 'candidates' as Page, label: 'Lista de Candidatos', icon: Users },
          { id: 'candidate-profile' as Page, label: 'Perfil do Candidato', icon: User },
          { id: 'create-job' as Page, label: 'Criar/Editar Vaga', icon: UserPlus },
        ]
      }
    ];

    return (
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <Button 
            size="lg"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-brand-primary to-brand-accent hover:scale-110 transition-transform duration-200"
          >
            <Navigation className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">BS</span>
              </div>
              Menu de Navegação
            </SheetTitle>
            <SheetDescription>
              Navegue entre todas as páginas do sistema
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
            <div className="space-y-6">
              {menuSections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="mb-3 font-semibold text-neutral-900 flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-brand-primary" />
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => navigateTo(page.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                          currentPage === page.id
                            ? 'bg-brand-primary text-white shadow-md'
                            : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <page.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{page.label}</span>
                        {currentPage === page.id && (
                          <CheckCircle2 className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  {idx < menuSections.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="absolute bottom-4 left-4 right-4 pt-4 border-t bg-white">
            <div className="text-xs text-neutral-500 text-center">
              Página atual: <span className="font-semibold text-brand-primary">{currentPage}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Job Landing Page
  const JobLandingPage = () => (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
              <span className="text-white font-bold text-xl">BS</span>
            </div>
            <span className="font-semibold text-xl text-neutral-900">Beauty Smile</span>
          </div>
          <Button onClick={() => navigateTo('application-form')} size="lg">
            Candidate-se <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-primary/5 to-brand-accent/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4">Assistente Odontológico</h1>
          <div className="h-1 w-32 bg-gradient-to-r from-brand-primary to-brand-accent mx-auto mb-8"></div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-neutral-700">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-primary" />
              <span>São Paulo, SP</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-brand-primary" />
              <span>CLT</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-primary" />
              <span>Segunda a Sexta</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={() => navigateTo('application-form')} size="lg">
              Candidate-se Agora <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="mr-2 h-4 w-4" />
              Salvar Vaga
            </Button>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-brand-primary" />
                Descrição da Vaga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-neutral-700 leading-relaxed">
                Estamos em busca de um(a) Assistente Odontológico(a) apaixonado(a) por proporcionar 
                excelência no atendimento e cuidado aos nossos pacientes. Se você valoriza a inovação, 
                trabalho em equipe e desenvolvimento profissional contínuo, essa oportunidade é para você!
              </p>
              <p className="text-neutral-700 leading-relaxed">
                Você será responsável por auxiliar os dentistas durante procedimentos, preparar 
                materiais e instrumentos, manter a organização da clínica, além de contribuir para 
                uma experiência acolhedora aos pacientes.
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-semantic-success" />
                Requisitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Experiência mínima de 2 anos como Assistente Odontológico',
                  'Curso técnico completo em Saúde Bucal',
                  'Conhecimento em radiologia odontológica',
                  'Excelente comunicação e empatia com pacientes',
                  'Organização e atenção aos detalhes'
                ].map((req, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-semantic-success flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-6 w-6 text-brand-secondary" />
                Benefícios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '🚌', label: 'Vale Transporte' },
                  { icon: '🍽️', label: 'Vale Refeição' },
                  { icon: '🏥', label: 'Plano de Saúde' },
                  { icon: '📚', label: 'Educação Continuada' },
                  { icon: '💰', label: 'PLR' },
                  { icon: '🎉', label: 'Day Off Aniversário' },
                  { icon: '🏋️', label: 'Gympass' },
                  { icon: '🌴', label: 'Férias Coletivas' }
                ].map((benefit, idx) => (
                  <div key={idx} className="text-center p-4 border border-neutral-200 rounded-lg hover:border-brand-accent hover:shadow-md transition-all duration-200">
                    <div className="text-3xl mb-2">{benefit.icon}</div>
                    <p className="text-sm text-neutral-700">{benefit.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selection Process */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-brand-accent" />
                Processo Seletivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {[
                  { step: '1', label: 'Candidatura', icon: User },
                  { step: '2', label: 'Testes', icon: Brain },
                  { step: '3', label: 'DISC/Big5', icon: BarChart3 },
                  { step: '4', label: 'Cultura', icon: MessageSquare },
                  { step: '5', label: 'Entrevista', icon: Users }
                ].map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-brand-primary" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-brand-primary">{item.step}</div>
                        <div className="text-xs text-neutral-600 hidden md:block">{item.label}</div>
                      </div>
                    </div>
                    {idx < 4 && (
                      <ChevronRight className="h-5 w-5 text-neutral-300 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-center">
              <Button onClick={() => navigateTo('application-form')} size="lg" className="w-full md:w-auto">
                Iniciar Candidatura <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );

  // Application Form Page
  const ApplicationFormPage = () => {
    const [formStep, setFormStep] = useState(1);
    const totalSteps = 5;
    const progress = (formStep / totalSteps) * 100;

    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="text-white font-bold">BS</span>
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Assistente Odontológico</div>
                <div className="text-xs text-neutral-500">São Paulo, SP</div>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigateTo('job-landing')}>
              Sair ✕
            </Button>
          </div>
        </header>

        {/* Form Content */}
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="mb-8">
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-neutral-600">
              Etapa {formStep} de {totalSteps}: Dados Pessoais
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>
                Preencha suas informações básicas para iniciar o processo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" placeholder="Digite seu nome completo" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" type="tel" placeholder="(11) 98765-4321" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input id="city" placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Input id="state" placeholder="SP" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Disponibilidade de Horário *</Label>
                <div className="space-y-2">
                  {[
                    'Integral (40h/semana)',
                    'Meio período (20h/semana)',
                    'Flexível'
                  ].map((option, idx) => (
                    <label key={idx} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-colors">
                      <input type="radio" name="availability" className="text-brand-primary" />
                      <span className="text-neutral-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload do Currículo (PDF, max 5MB) *</Label>
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-brand-primary hover:bg-brand-primary/5 transition-colors cursor-pointer">
                  <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-neutral-700 mb-1">Clique ou arraste arquivo aqui</p>
                  <p className="text-xs text-neutral-500">PDF até 5MB</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigateTo('job-landing')}>
                ← Voltar
              </Button>
              <Button onClick={() => {
                toast.success('Dados salvos com sucesso!');
                navigateTo('test-instructions');
              }}>
                Próxima Etapa →
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  // Test Instructions Page
  const TestInstructionsPage = () => (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
              <span className="text-white font-bold">BS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-neutral-700">
            <User className="h-4 w-4" />
            <span className="text-sm">Olá, Maria</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card className="animate-scaleIn">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center mx-auto mb-4">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <CardTitle>Teste Big Five</CardTitle>
            <CardDescription>Avaliação de Personalidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-neutral-50 p-6 rounded-lg space-y-3">
              <p className="text-neutral-700">
                Este questionário avalia 5 traços de personalidade fundamentais:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { icon: '🎨', label: 'Abertura à Experiência' },
                  { icon: '📋', label: 'Conscienciosidade' },
                  { icon: '🤝', label: 'Extroversão' },
                  { icon: '❤️', label: 'Amabilidade' },
                  { icon: '😰', label: 'Neuroticismo' }
                ].map((trait, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-2xl">{trait.icon}</span>
                    <span className="text-neutral-700">{trait.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-brand-primary" />
                <span className="text-neutral-700">Duração: 10-15 minutos</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand-primary" />
                <span className="text-neutral-700">Questões: 120 perguntas</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-primary" />
                <span className="text-neutral-700">Respostas salvas automaticamente</span>
              </div>
            </div>

            <div className="bg-brand-primary/5 p-6 rounded-lg border border-brand-primary/20">
              <h4 className="font-semibold text-neutral-900 mb-3">Como Responder</h4>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span>Não há respostas certas ou erradas</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span>Seja honesto(a) e espontâneo(a)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span>Responda com base em como você GERALMENTE se comporta</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span>Use a escala de 1 a 5</span>
                </li>
              </ul>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-brand-primary" />
              <span className="text-neutral-700">Li e entendi as instruções</span>
            </label>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigateTo('test-bigfive')} size="lg" className="w-full">
              Iniciar Teste →
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  // Big Five Test Page
  const TestBigFivePage = () => {
    const totalQuestions = 120;
    const progress = (currentQuestion / totalQuestions) * 100;

    const handleAnswer = (value: number) => {
      setSelectedAnswer(value);
      setTimeout(() => {
        if (currentQuestion < totalQuestions) {
          setCurrentQuestion(currentQuestion + 1);
          setSelectedAnswer(null);
        } else {
          navigateTo('test-complete');
        }
      }, 300);
    };

    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-white border-b border-neutral-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="text-white font-bold">BS</span>
              </div>
              <span className="text-sm text-neutral-700">Maria Silva</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <Clock className="h-4 w-4" />
              <span className="text-sm">05:34</span>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Card className="animate-slideInBottom">
            <CardContent className="pt-8 space-y-6">
              <div>
                <p className="text-sm text-neutral-600 mb-2">
                  QUESTÃO {currentQuestion} DE {totalQuestions}
                </p>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="text-center py-8">
                <p className="text-xl text-neutral-900 mb-8">
                  "Eu sou uma pessoa criativa e imaginativa"
                </p>

                <div className="flex items-center justify-between mb-4 text-xs text-neutral-500">
                  <span>Discordo<br/>Totalmente</span>
                  <span>Concordo<br/>Totalmente</span>
                </div>

                <div className="flex items-center justify-between gap-3 mb-8">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      className={`flex flex-col items-center gap-2 flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedAnswer === value
                          ? 'border-brand-primary bg-brand-primary/10 scale-105'
                          : 'border-neutral-200 hover:border-brand-primary/40 hover:scale-105'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedAnswer === value
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-neutral-300 bg-white'
                      }`}>
                        {value}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Discordo<br/>Totalmente</span>
                  <span>Discordo<br/>Parcialmente</span>
                  <span>Neutro</span>
                  <span>Concordo<br/>Parcialmente</span>
                  <span>Concordo<br/>Totalmente</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Test Complete Page
  const TestCompletePage = () => (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full animate-scaleIn">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-semantic-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-semantic-success" />
          </div>

          <div>
            <h2 className="mb-2">Teste Concluído com Sucesso!</h2>
            <p className="text-neutral-600">
              Obrigado por completar o Teste Big Five.<br />
              Suas respostas foram enviadas com sucesso.
            </p>
          </div>

          <Card className="bg-neutral-50 border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">📊 Suas Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Tempo gasto:</span>
                <span className="font-semibold text-neutral-900">12 minutos e 34 segundos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Questões respondidas:</span>
                <span className="font-semibold text-neutral-900">120/120</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 text-sm text-neutral-600">
            <p className="flex items-center gap-2 justify-center">
              <Mail className="h-4 w-4" />
              Você receberá um email com seus resultados em breve.
            </p>
            <p className="flex items-center gap-2 justify-center">
              <Target className="h-4 w-4" />
              Próximo passo: Aguarde contato do RH sobre as próximas etapas.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => navigateTo('dashboard')} variant="outline">
            Fechar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  // Dashboard Page
  const DashboardPage = () => (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation */}
      <header className="bg-neutral-900 text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="font-bold">BS</span>
              </div>
              <span className="font-semibold">Beauty Smile</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button className="text-sm hover:text-brand-accent transition-colors border-b-2 border-brand-accent pb-1">
                Dashboard
              </button>
              <button onClick={() => navigateTo('create-job')} className="text-sm hover:text-brand-accent transition-colors text-neutral-400">
                Vagas
              </button>
              <button onClick={() => navigateTo('candidates')} className="text-sm hover:text-brand-accent transition-colors text-neutral-400">
                Candidatos
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-brand-primary text-white">JS</AvatarFallback>
            </Avatar>
            <span className="text-sm hidden md:block">João Silva</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="mb-2">Olá, João Silva 👋</h1>
          <p className="text-neutral-600">Aqui está um resumo do seu recrutamento</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: BarChart3, label: 'Vagas Ativas', value: '12', color: 'text-brand-primary' },
            { icon: Users, label: 'Candidatos', value: '45', color: 'text-brand-accent' },
            { icon: CheckCircle2, label: 'Aprovados', value: '8', color: 'text-semantic-success' },
            { icon: Clock, label: 'Em Análise', value: '15', color: 'text-semantic-warning' }
          ].map((metric, idx) => (
            <Card key={idx} className="hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                  <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
                    +{Math.floor(Math.random() * 20)}%
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">{metric.value}</div>
                <div className="text-sm text-neutral-600">{metric.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Jobs */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5 text-brand-primary" />
                Vagas Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('create-job')}>
                Ver Todas →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: 'Assistente Odontológico', location: 'São Paulo', candidates: 8, approved: 3 },
              { title: 'Recepcionista', location: 'Rio de Janeiro', candidates: 15, approved: 5 }
            ].map((job, idx) => (
              <div key={idx} className="p-4 border border-neutral-200 rounded-lg hover:border-brand-accent hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">{job.title}</h4>
                    <p className="text-sm text-neutral-600 flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-neutral-600">{job.candidates} candidatos</span>
                    <span className="text-semantic-success">{job.approved} aprovados</span>
                    <Button size="sm" variant="outline">Gerenciar</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Candidates Awaiting Review */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-accent" />
                Candidatos Aguardando Análise
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('candidates')}>
                Ver Todos →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'Maria Silva', job: 'Assistente Odontológico', time: '2 horas', status: 'approved', bigfive: 78, disc: 'ID', intel: 85, culture: 82 },
              { name: 'João Santos', job: 'Recepcionista', time: '5 horas', status: 'warning', bigfive: 65, disc: 'SC', intel: 42, culture: 58 }
            ].map((candidate, idx) => (
              <div 
                key={idx} 
                className="p-5 border border-neutral-200 rounded-lg hover:border-brand-accent hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => navigateTo('candidate-profile')}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-accent text-white">
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-neutral-900">{candidate.name}</h4>
                      <p className="text-sm text-neutral-600">{candidate.job}</p>
                      <p className="text-xs text-neutral-400 mt-1">Há {candidate.time}</p>
                    </div>
                  </div>
                  <Badge variant={candidate.status === 'approved' ? 'default' : 'secondary'} 
                         className={candidate.status === 'approved' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-semantic-warning/10 text-semantic-warning'}>
                    {candidate.status === 'approved' ? '✅ Aprovado' : '⚠️ Investigar'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">Big Five: {candidate.bigfive}</Badge>
                  <Badge variant="outline">DISC: {candidate.disc}</Badge>
                  <Badge variant="outline">Intel: P{candidate.intel}</Badge>
                  <Badge variant="outline">Cult: {candidate.culture}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Candidates List Page
  const CandidatesPage = () => (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-neutral-900 text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="font-bold">BS</span>
              </div>
              <span className="font-semibold">Beauty Smile</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => navigateTo('dashboard')} className="text-sm hover:text-brand-accent transition-colors text-neutral-400">
                Dashboard
              </button>
              <button className="text-sm hover:text-brand-accent transition-colors text-neutral-400">
                Vagas
              </button>
              <button className="text-sm hover:text-brand-accent transition-colors border-b-2 border-brand-accent pb-1">
                Candidatos
              </button>
            </nav>
          </div>
          <Avatar>
            <AvatarFallback className="bg-brand-primary text-white">JS</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="mb-2">👥 Candidatos (45)</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input placeholder="Buscar candidatos..." className="pl-10" />
              </div>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {['Todos', 'Triagem', 'Big Five', 'DISC', 'Inteligência', 'Cultura', 'Aprovados', 'Rejeitados'].map((filter, idx) => (
                <Button 
                  key={idx} 
                  variant={idx === 0 ? 'default' : 'outline'} 
                  size="sm"
                  className={idx === 0 ? 'bg-brand-primary' : ''}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            { name: 'Maria Silva', job: 'Assistente Odontológico', time: '2 horas', status: 'approved', bigfive: 78, disc: 'ID', intel: 85, culture: 82 },
            { name: 'João Santos', job: 'Recepcionista', time: '5 horas', status: 'warning', bigfive: 65, disc: 'SC', intel: 42, culture: 58 },
            { name: 'Ana Costa', job: 'Assistente Odontológico', time: '1 dia', status: 'approved', bigfive: 82, disc: 'DI', intel: 78, culture: 88 }
          ].map((candidate, idx) => (
            <Card 
              key={idx} 
              className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-brand-accent"
              onClick={() => navigateTo('candidate-profile')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-accent text-white text-lg">
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1">{candidate.name}</h3>
                      <p className="text-sm text-neutral-600 mb-1">{candidate.job}</p>
                      <p className="text-xs text-neutral-400">Há {candidate.time}</p>
                    </div>
                  </div>
                  <Badge variant={candidate.status === 'approved' ? 'default' : 'secondary'} 
                         className={candidate.status === 'approved' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-semantic-warning/10 text-semantic-warning'}>
                    {candidate.status === 'approved' ? '✅ Aprovado' : '⚠️ Investigar'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="bg-brand-primary/5">Big Five: {candidate.bigfive}</Badge>
                  <Badge variant="outline" className="bg-brand-accent/5">DISC: {candidate.disc}</Badge>
                  <Badge variant="outline" className="bg-brand-secondary/5">Intel: P{candidate.intel}</Badge>
                  <Badge variant="outline" className="bg-semantic-success/5">Cult: {candidate.culture}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Candidate Profile Page
  const CandidateProfilePage = () => (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-neutral-900 text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <span className="font-bold">BS</span>
              </div>
              <span className="font-semibold">Beauty Smile</span>
            </div>
          </div>
          <Avatar>
            <AvatarFallback className="bg-brand-primary text-white">JS</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigateTo('candidates')} className="mb-6">
          ← Voltar
        </Button>

        {/* Candidate Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-accent text-white text-2xl">
                    MS
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="mb-2">Maria Silva</h1>
                  <p className="text-neutral-600 mb-2">Assistente Odontológico</p>
                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      São Paulo, SP
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      maria@email.com
                    </span>
                  </div>
                </div>
              </div>
              <Badge className="bg-semantic-success/10 text-semantic-success">
                ✅ Aprovado
              </Badge>
            </div>

            <div className="flex gap-3">
              <Button className="bg-semantic-success hover:bg-semantic-success-700">
                Aprovar para Entrevista
              </Button>
              <Button variant="outline" className="text-semantic-error border-semantic-error hover:bg-semantic-error/5">
                Rejeitar
              </Button>
              <Button variant="outline">
                Adicionar Nota
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="bigfive">Big Five</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="intelligence">Inteligência</TabsTrigger>
            <TabsTrigger value="culture">Cultura</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Process Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-primary" />
                  Resumo do Processo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Triagem Inicial', date: '20/10/2025', status: 'complete' },
                  { label: 'Big Five: 78/100', date: '22/10/2025', status: 'complete' },
                  { label: 'DISC: ID - Influente-Dominante', date: '22/10/2025', status: 'complete' },
                  { label: 'Inteligência: 85/100 (P85)', date: '23/10/2025', status: 'complete' },
                  { label: 'Cultura: 82/100', date: '25/10/2025', status: 'complete' },
                  { label: 'Aguardando Entrevista', date: '-', status: 'pending' }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {step.status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5 text-semantic-success flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-semantic-warning flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="text-neutral-900">{step.label}</span>
                    </div>
                    <span className="text-sm text-neutral-500">{step.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Personal Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-brand-primary" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Email</p>
                  <p className="text-neutral-900">maria@email.com</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Telefone</p>
                  <p className="text-neutral-900">(11) 98765-4321</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Cidade</p>
                  <p className="text-neutral-900">São Paulo, SP</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1">Disponibilidade</p>
                  <p className="text-neutral-900">Integral</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Ver Currículo
                </Button>
              </CardFooter>
            </Card>

            {/* AI Recommendation */}
            <Card className="border-brand-accent bg-gradient-to-br from-brand-primary/5 to-brand-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-brand-accent" />
                  Recomendação Geral da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-neutral-900">Compatibilidade Geral:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-semantic-success">81/100</span>
                    <div className="w-3 h-3 rounded-full bg-semantic-success"></div>
                  </div>
                </div>

                <Separator />

                <p className="text-neutral-700 leading-relaxed">
                  "Candidata demonstra excelente alinhamento com os requisitos da vaga. 
                  Perfil comportamental adequado, boa capacidade cognitiva e forte alinhamento 
                  cultural. Recomendamos fortemente avançar para a próxima etapa do processo seletivo."
                </p>

                <div className="bg-semantic-success/10 p-4 rounded-lg border border-semantic-success/20">
                  <p className="font-semibold text-semantic-success flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    RECOMENDAÇÃO: APROVAR PARA ENTREVISTA
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bigfive">
            <Card>
              <CardHeader>
                <CardTitle>Resultados Big Five</CardTitle>
                <CardDescription>Avaliação detalhada dos 5 traços de personalidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { trait: 'Abertura à Experiência', score: 82, icon: '🎨' },
                  { trait: 'Conscienciosidade', score: 85, icon: '📋' },
                  { trait: 'Extroversão', score: 72, icon: '🤝' },
                  { trait: 'Amabilidade', score: 88, icon: '❤️' },
                  { trait: 'Neuroticismo', score: 45, icon: '😰' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-neutral-900 flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        {item.trait}
                      </span>
                      <span className="font-semibold text-brand-primary">{item.score}/100</span>
                    </div>
                    <Progress value={item.score} className="h-3" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Router
  const renderPage = () => {
    switch (currentPage) {
      case 'job-landing':
        return <JobLandingPage />;
      case 'application-form':
        return <ApplicationFormPage />;
      case 'test-instructions':
        return <TestInstructionsPage />;
      case 'test-bigfive':
        return <TestBigFivePage />;
      case 'test-complete':
        return <TestCompletePage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'candidates':
        return <CandidatesPage />;
      case 'candidate-profile':
        return <CandidateProfilePage />;
      default:
        return <JobLandingPage />;
    }
  };

  return (
    <>
      {renderPage()}
      <NavigationMenu />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
