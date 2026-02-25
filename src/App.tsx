import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";

// Тип для задачи
type Task = {
  id: number;
  created_at: string;
  user_id: string;
  text: string;
  completed: boolean;
  date: string;
  important: boolean;
};

function App() {
  // ========== СОСТОЯНИЯ ==========
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [view, setView] = useState<"daily" | "all">("daily");

  // ========== ЭФФЕКТ ДЛЯ ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ ==========
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ========== ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ЗАДАЧ ==========
  // Загружаем задачи прямо здесь, без отдельной функции
  useEffect(() => {
    async function loadTasks() {
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Ошибка загрузки:", error);
      } else {
        setTasks(data || []);
        if (data && data.length > 0) {
          setSelectedDate(data[0].date);
        } else {
          setSelectedDate(new Date().toISOString().split("T")[0]);
        }
      }
    }

    loadTasks();
  }, [user]); // Загружаем только когда user меняется

  // ========== ФУНКЦИИ АВТОРИЗАЦИИ ==========
  async function handleSignUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) alert(error.message);
  }

  async function handleSignIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setTasks([]);
  }

  // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАДАЧАМИ ==========
  async function handleAddTask() {
    if (!user || newTask.trim() === "") return;

    const newTaskObj = {
      user_id: user.id,
      text: newTask,
      completed: false,
      date: selectedDate,
      important: false,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([newTaskObj])
      .select();

    if (error) {
      console.error("Ошибка добавления:", error);
    } else if (data) {
      setTasks([...tasks, ...data]);
      setNewTask("");
    }
  }

  async function handleToggleTask(id: number, currentCompleted: boolean) {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !currentCompleted })
      .eq("id", id);

    if (!error) {
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, completed: !currentCompleted } : task,
        ),
      );
    }
  }

  async function handleToggleImportant(id: number, currentImportant: boolean) {
    const { error } = await supabase
      .from("tasks")
      .update({ important: !currentImportant })
      .eq("id", id);

    if (!error) {
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, important: !currentImportant } : task,
        ),
      );
    }
  }

  async function handleDeleteTask(id: number) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (!error) {
      setTasks(tasks.filter((task) => task.id !== id));
    }
  }

  // ========== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ==========
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((task) => task.date === today);
  const mainTask = todayTasks.find((task) => task.important && !task.completed);
  const otherTodayTasks = todayTasks.filter(
    (task) => !(task.important && !task.completed) || task.completed,
  );

  const totalToday = todayTasks.length;
  const completedToday = todayTasks.filter((task) => task.completed).length;
  const progressToday =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const uniqueDates = Array.from(
    new Set(tasks.map((task) => task.date)),
  ).sort();
  const tasksForSelectedDate = tasks.filter(
    (task) => task.date === selectedDate,
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  // ========== ЭКРАН ЗАГРУЗКИ ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-2xl text-indigo-600">Загрузка...</div>
      </div>
    );
  }

  // ========== ЭКРАН ВХОДА/РЕГИСТРАЦИИ ==========
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">
              🚀 Автопилот
            </h1>
            <p className="text-gray-600">Войди, чтобы продолжить</p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            {isLogin ? (
              <>
                <button
                  onClick={handleSignIn}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Войти
                </button>
                <p className="text-center text-gray-600">
                  Нет аккаунта?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="text-indigo-600 hover:underline"
                  >
                    Зарегистрироваться
                  </button>
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleSignUp}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Зарегистрироваться
                </button>
                <p className="text-center text-gray-600">
                  Уже есть аккаунт?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="text-indigo-600 hover:underline"
                  >
                    Войти
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== ОСНОВНОЕ ПРИЛОЖЕНИЕ ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Шапка с выходом */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                Автопилот
              </h1>
              <p className="text-indigo-100 text-lg">
                {getGreeting()}, {user.email}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView("daily")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "daily"
                    ? "bg-white text-indigo-600"
                    : "text-white hover:bg-white/20"
                }`}
              >
                Сводка
              </button>
              <button
                onClick={() => setView("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "all"
                    ? "bg-white text-indigo-600"
                    : "text-white hover:bg-white/20"
                }`}
              >
                Все задачи
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* СВОДКА ДНЯ */}
        {view === "daily" && (
          <>
            {mainTask ? (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⭐</span>
                    <span className="text-indigo-200 font-medium">
                      Главная задача дня
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold mb-4">{mainTask.text}</h2>

                  <button
                    onClick={() =>
                      handleToggleTask(mainTask.id, mainTask.completed)
                    }
                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {mainTask.completed
                      ? "✅ Выполнено"
                      : "○ Отметить выполненным"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  На сегодня всё!
                </h2>
                <p className="text-gray-500">Все главные задачи выполнены.</p>
              </div>
            )}

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <span className="text-xl">📊</span>
                  </div>
                  <span className="text-gray-600">Прогресс</span>
                </div>
                <div className="text-3xl font-bold text-indigo-600">
                  {progressToday}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {completedToday} из {totalToday} задач
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <span className="text-xl">⭐</span>
                  </div>
                  <span className="text-gray-600">Важных</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {todayTasks.filter((t) => t.important && !t.completed).length}
                </div>
                <div className="text-sm text-gray-500 mt-1">осталось</div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <span className="text-xl">✅</span>
                  </div>
                  <span className="text-gray-600">Выполнено</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {completedToday}
                </div>
                <div className="text-sm text-gray-500 mt-1">сегодня</div>
              </div>
            </div>

            {/* Остальные задачи */}
            {otherTodayTasks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                  Остальные задачи на сегодня
                </h3>

                <div className="space-y-3">
                  {otherTodayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:shadow-md transition-all border border-gray-100"
                    >
                      <button
                        onClick={() =>
                          handleToggleTask(task.id, task.completed)
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          task.completed
                            ? "bg-green-500 text-white"
                            : "bg-white border-2 border-gray-300 hover:border-indigo-400"
                        }`}
                      >
                        {task.completed && "✓"}
                      </button>

                      <span
                        className={`flex-1 ${
                          task.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {task.text}
                      </span>

                      <button
                        onClick={() =>
                          handleToggleImportant(task.id, task.important)
                        }
                        className={`text-lg transition-all ${
                          task.important
                            ? "text-yellow-500"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      >
                        ⭐
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* РЕЖИМ ВСЕХ ЗАДАЧ */}
        {view === "all" && (
          <>
            {/* Выбор даты */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Выбери день
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {uniqueDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDate(today)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                >
                  Сегодня
                </button>
              </div>
            </div>

            {/* Добавление задачи */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Новая задача
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Что нужно сделать?"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:w-40"
                >
                  {uniqueDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddTask}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Добавить
                </button>
              </div>
            </div>

            {/* Список задач */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                Задачи на {selectedDate}
              </h2>

              {tasksForSelectedDate.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✨</div>
                  <p className="text-gray-500 text-lg">
                    На этот день пока нет задач
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasksForSelectedDate.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:shadow-md transition-all border border-gray-100"
                    >
                      <button
                        onClick={() =>
                          handleToggleTask(task.id, task.completed)
                        }
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          task.completed
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
                            : "bg-white border-2 border-gray-300 hover:border-indigo-400"
                        }`}
                      >
                        {task.completed && "✓"}
                      </button>

                      <span
                        className={`flex-1 text-lg ${
                          task.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {task.text}
                      </span>

                      <button
                        onClick={() =>
                          handleToggleImportant(task.id, task.important)
                        }
                        className={`text-xl transition-all ${
                          task.important
                            ? "text-yellow-500"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      >
                        ⭐
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Мотивация */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Сделай сегодня то, что завтра будет гордиться</p>
        </div>
      </div>
    </div>
  );
}

export default App;
