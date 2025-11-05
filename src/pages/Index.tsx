import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import YandexMap from '@/components/YandexMap';

const Index = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [credentials, setCredentials] = useState({ login: '', password: '' });

  const adminCredentials = [
    { login: 'SergSyn', password: 'Synachev(16072007)' },
    { login: 'IvanGesh', password: 'IvanGesh^2025^' }
  ];

  const handleLogin = () => {
    const isValid = adminCredentials.some(
      cred => cred.login === credentials.login && cred.password === credentials.password
    );
    if (isValid) {
      setIsAdmin(true);
      setLoginOpen(false);
    }
  };

  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMark, setNewMark] = useState({ type: 'tick', lat: 0, lng: 0, description: '' });
  const [addMarkOpen, setAddMarkOpen] = useState(false);

  const [plannedZones, setPlannedZones] = useState<any[]>([]);

  const [currentZones, setCurrentZones] = useState<any[]>([]);

  const [news, setNews] = useState<any[]>([]);
  const [newNewsItem, setNewNewsItem] = useState({ title: '', content: '' });

  const API_MARKS = 'https://functions.poehali.dev/803d119d-b001-4c47-87cf-2e1142712896';
  const API_TREATMENTS = 'https://functions.poehali.dev/3b5b6f93-220b-4cf2-aad8-4783067093ff';
  const API_NEWS = 'https://functions.poehali.dev/13cce3cc-4cd3-4b16-b6db-185381c2a465';

  useEffect(() => {
    loadMarks();
    loadPlannedTreatments();
    loadCurrentTreatments();
    loadNews();
  }, []);

  const loadMarks = async () => {
    try {
      const response = await fetch(API_MARKS);
      const data = await response.json();
      setMarks(data.marks || []);
    } catch (error) {
      console.error('Ошибка загрузки меток:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlannedTreatments = async () => {
    try {
      const response = await fetch(`${API_TREATMENTS}?type=planned`);
      const data = await response.json();
      setPlannedZones(data.treatments || []);
    } catch (error) {
      console.error('Ошибка загрузки запланированных обработок:', error);
    }
  };

  const loadCurrentTreatments = async () => {
    try {
      const response = await fetch(`${API_TREATMENTS}?type=current`);
      const data = await response.json();
      setCurrentZones(data.treatments || []);
    } catch (error) {
      console.error('Ошибка загрузки текущих обработок:', error);
    }
  };

  const loadNews = async () => {
    try {
      const response = await fetch(API_NEWS);
      const data = await response.json();
      setNews(data.news || []);
    } catch (error) {
      console.error('Ошибка загрузки новостей:', error);
    }
  };

  const handleAddMark = async () => {
    if (newMark.lat === 0 || newMark.lng === 0) {
      toast.error('Укажите координаты на карте');
      return;
    }

    try {
      const response = await fetch(API_MARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newMark.type,
          latitude: newMark.lat,
          longitude: newMark.lng,
          description: newMark.description
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Метка добавлена на проверку');
        setAddMarkOpen(false);
        setNewMark({ type: 'tick', lat: 0, lng: 0, description: '' });
        loadMarks();
      } else {
        toast.error(data.error || 'Ошибка добавления метки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    }
  };

  const handleVerifyMark = async (markId: number, verified: boolean) => {
    try {
      const response = await fetch(API_MARKS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': credentials.login
        },
        body: JSON.stringify({ id: markId, verified })
      });

      if (response.ok) {
        toast.success(verified ? 'Метка подтверждена' : 'Метка отклонена');
        loadMarks();
      }
    } catch (error) {
      toast.error('Ошибка обновления метки');
    }
  };

  const handleAddNews = async () => {
    if (!newNewsItem.title || !newNewsItem.content) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const response = await fetch(API_NEWS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': credentials.login
        },
        body: JSON.stringify(newNewsItem)
      });

      if (response.ok) {
        toast.success('Новость опубликована');
        setNewNewsItem({ title: '', content: '' });
        loadNews();
      }
    } catch (error) {
      toast.error('Ошибка публикации новости');
    }
  };

  const handleDeleteNews = async (newsId: number) => {
    try {
      const response = await fetch(`${API_NEWS}?id=${newsId}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': credentials.login }
      });

      if (response.ok) {
        toast.success('Новость удалена');
        loadNews();
      }
    } catch (error) {
      toast.error('Ошибка удаления новости');
    }
  };

  const handleMapClick = (coords: [number, number]) => {
    setNewMark({ ...newMark, lat: coords[0], lng: coords[1] });
    toast.info(`Координаты: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`);
  };

  const stats = {
    totalMarks: marks.length,
    tickMarks: marks.filter(m => m.type === 'tick').length,
    hogweedMarks: marks.filter(m => m.type === 'hogweed').length,
    verifiedMarks: marks.filter(m => m.verified).length,
    pendingMarks: marks.filter(m => !m.verified).length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-sidebar text-sidebar-foreground shadow-lg">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Map" size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Мониторинг</h1>
              <p className="text-xs text-sidebar-foreground/70">Московская область</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === 'main' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('main')}
          >
            <Icon name="MapPin" size={18} />
            Главная
          </Button>
          <Button
            variant={activeTab === 'planned' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('planned')}
          >
            <Icon name="Calendar" size={18} />
            Предстоящие обработки
          </Button>
          <Button
            variant={activeTab === 'current' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('current')}
          >
            <Icon name="Activity" size={18} />
            Текущие обработки
          </Button>
          <Button
            variant={activeTab === 'news' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('news')}
          >
            <Icon name="Newspaper" size={18} />
            Новости
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('stats')}
          >
            <Icon name="BarChart3" size={18} />
            Статистика
          </Button>
          <Button
            variant={activeTab === 'support' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setActiveTab('support')}
          >
            <Icon name="MessageCircle" size={18} />
            Поддержка
          </Button>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-sidebar-border">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Icon name="Shield" size={14} />
                Администратор
              </Badge>
            </div>
          ) : (
            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Icon name="Lock" size={16} />
                  Вход для админов
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Вход в панель администратора</DialogTitle>
                  <DialogDescription>
                    Введите учетные данные для доступа к административной панели
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="login">Логин</Label>
                    <Input
                      id="login"
                      value={credentials.login}
                      onChange={(e) => setCredentials({ ...credentials, login: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleLogin} className="w-full">
                    Войти
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'main' && 'Интерактивная карта меток'}
                {activeTab === 'planned' && 'Запланированные обработки'}
                {activeTab === 'current' && 'Текущие обработки'}
                {activeTab === 'news' && 'Новости и объявления'}
                {activeTab === 'stats' && 'Статистика по областям'}
                {activeTab === 'support' && 'Поддержка'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Система мониторинга клещей и борщевика
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 bg-[#78350f] rounded-full" />
                Клещи
              </Badge>
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 bg-[#15803d] rounded-full" />
                Борщевик
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeTab === 'main' && (
            <div className="space-y-6">
              <Card className="p-6">
                <YandexMap
                  marks={marks}
                  showUserLocation={true}
                  onMapClick={handleMapClick}
                />
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Icon name="AlertCircle" size={18} />
                    Последние метки
                  </h3>
                  <div className="space-y-3">
                    {marks.slice(0, 5).map((mark) => (
                      <div key={mark.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: mark.type === 'tick' ? '#78350f' : '#15803d' }}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {mark.type === 'tick' ? 'Укус клеща' : 'Борщевик'}
                            </p>
                            <p className="text-xs text-gray-500">{mark.date}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Badge variant={mark.verified ? 'default' : 'secondary'}>
                            {mark.verified ? 'Проверено' : 'На проверке'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Icon name="Plus" size={18} />
                    Добавить метку
                  </h3>
                  <Dialog open={addMarkOpen} onOpenChange={setAddMarkOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full gap-2">
                        <Icon name="Plus" size={16} />
                        Создать метку
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить метку</DialogTitle>
                        <DialogDescription>
                          Кликните на карте или введите координаты
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Тип метки</Label>
                          <Select value={newMark.type} onValueChange={(value) => setNewMark({ ...newMark, type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tick">Укус клеща</SelectItem>
                              <SelectItem value="hogweed">Борщевик</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Описание</Label>
                          <Textarea
                            value={newMark.description}
                            onChange={(e) => setNewMark({ ...newMark, description: e.target.value })}
                            placeholder="Опишите ситуацию"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Широта</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={newMark.lat || ''}
                              onChange={(e) => setNewMark({ ...newMark, lat: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label>Долгота</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={newMark.lng || ''}
                              onChange={(e) => setNewMark({ ...newMark, lng: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddMark} className="w-full">
                          Добавить метку
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <p className="text-xs text-gray-500 mt-3">
                    Кликните на карте чтобы указать координаты
                  </p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'planned' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <YandexMap zones={plannedZones} />
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Календарь обработок</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="List" size={18} />
                  Список запланированных обработок
                </h3>
                <div className="space-y-3">
                  {plannedZones.map((zone) => (
                    <div key={zone.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: zone.color }} />
                        <div>
                          <p className="font-medium">{zone.area}</p>
                          <p className="text-sm text-gray-500">
                            {zone.type === 'tick' ? 'Обработка от клещей' : 'Обработка от борщевика'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{zone.date}</p>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="mt-1">
                            <Icon name="Edit" size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isAdmin && (
                    <Button variant="outline" className="w-full gap-2">
                      <Icon name="Plus" size={16} />
                      Добавить обработку
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'current' && (
            <div className="space-y-6">
              <Card className="p-6">
                <YandexMap zones={currentZones} />
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentZones.map((zone) => (
                  <Card key={zone.id} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-lg"
                        style={{ backgroundColor: zone.type === 'tick' ? '#78350f' : '#15803d' }}
                      />
                      <div>
                        <h4 className="font-semibold">{zone.area}</h4>
                        <p className="text-sm text-gray-500">
                          {zone.type === 'tick' ? 'Обработка от клещей' : 'Обработка от борщевика'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Начало:</span>
                        <span className="font-medium">{zone.startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Окончание:</span>
                        <span className="font-medium">{zone.endDate}</span>
                      </div>
                      <Badge variant="default" className="w-full justify-center">
                        В процессе
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-6">
              {isAdmin && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Icon name="Plus" size={18} />
                    Добавить новость
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Заголовок</Label>
                      <Input
                        value={newNewsItem.title}
                        onChange={(e) => setNewNewsItem({ ...newNewsItem, title: e.target.value })}
                        placeholder="Введите заголовок новости"
                      />
                    </div>
                    <div>
                      <Label>Содержание</Label>
                      <Textarea
                        value={newNewsItem.content}
                        onChange={(e) => setNewNewsItem({ ...newNewsItem, content: e.target.value })}
                        placeholder="Введите текст новости"
                        rows={5}
                      />
                    </div>
                    <Button onClick={handleAddNews} className="gap-2">
                      <Icon name="Send" size={16} />
                      Опубликовать
                    </Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {news.map((item) => (
                  <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <Badge variant="outline">{item.date}</Badge>
                    </div>
                    <p className="text-gray-600">{item.content}</p>
                    {isAdmin && (
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => handleDeleteNews(item.id)}>
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name="MapPin" size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Всего меток</p>
                      <p className="text-2xl font-bold">{stats.totalMarks}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#78350f]/10 rounded-lg flex items-center justify-center">
                      <Icon name="Bug" size={24} className="text-[#78350f]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Клещи</p>
                      <p className="text-2xl font-bold">{stats.tickMarks}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#15803d]/10 rounded-lg flex items-center justify-center">
                      <Icon name="Leaf" size={24} className="text-[#15803d]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Борщевик</p>
                      <p className="text-2xl font-bold">{stats.hogweedMarks}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon name="CheckCircle" size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Проверено</p>
                      <p className="text-2xl font-bold">{stats.verifiedMarks}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="BarChart3" size={18} />
                  Статистика по областям
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Москва</span>
                      <span className="text-sm text-gray-500">45 меток</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Московская область</span>
                      <span className="text-sm text-gray-500">30 меток</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                </div>
              </Card>

              {isAdmin && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Icon name="AlertTriangle" size={18} />
                    Метки на проверке
                  </h3>
                  <div className="space-y-3">
                    {marks.filter(m => !m.verified).map((mark) => (
                      <div key={mark.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: mark.type === 'tick' ? '#78350f' : '#15803d' }}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {mark.type === 'tick' ? 'Укус клеща' : 'Борщевик'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mark.lat.toFixed(4)}, {mark.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleVerifyMark(mark.id, true)}>
                            <Icon name="Check" size={14} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleVerifyMark(mark.id, false)}>
                            <Icon name="X" size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="MessageCircle" size={18} />
                  Связаться с поддержкой
                </h3>
                <div className="space-y-4">
                  <Button
                    className="w-full gap-2 h-auto py-4"
                    onClick={() => window.open('https://t.me/+6v-uva0uF4piNmFi', '_blank')}
                  >
                    <Icon name="Send" size={20} />
                    <div className="text-left">
                      <p className="font-semibold">Telegram</p>
                      <p className="text-xs opacity-90">Присоединиться к группе поддержки</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2 h-auto py-4"
                    onClick={() => window.location.href = 'mailto:evolutionxprojects@mail.ru'}
                  >
                    <Icon name="Mail" size={20} />
                    <div className="text-left">
                      <p className="font-semibold">Email</p>
                      <p className="text-xs opacity-70">evolutionxprojects@mail.ru</p>
                    </div>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Info" size={18} />
                  О системе
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    Система мониторинга предназначена для отслеживания случаев укусов клещей и мест произрастания борщевика на территории Москвы и Московской области.
                  </p>
                  <p>
                    Пользователи могут отмечать места обнаружения, а администраторы проверяют метки и планируют обработку территорий.
                  </p>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-400">Версия 1.0.0 • 2025</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;