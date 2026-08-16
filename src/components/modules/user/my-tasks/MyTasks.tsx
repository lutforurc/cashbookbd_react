import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { FiPlus, FiTrash2, FiBookmark, FiCheck } from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import httpService from '../../../services/httpService';

interface Todo {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  color: string;
  is_pinned: boolean;
  is_completed: boolean;
  reminder_time?: string;
}

const COLORS = ['#FFE5B4', '#B4E5FF', '#FFB4E5', '#E5FFB4', '#FFE5D9', '#D9E5FF'];

export default function MyTasks() {
  const authUser = useSelector((state: any) => state.auth.user);
  const [todos, setTodos] = useState<{ today: Todo[]; upcoming: Todo[] }>({ today: [], upcoming: [] });
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await httpService.get('/user-todos');
      const data = res.data?.data;
      if (data && typeof data === 'object' && (data.today || data.upcoming)) {
        setTodos(data);
      } else {
        setTodos({ today: [], upcoming: [] });
      }
    } catch (err) {
      console.error('Failed to load todos', err);
      setTodos({ today: [], upcoming: [] });
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (!newTitle.trim()) return;

    try {
      await httpService.post('/user-todos', {
        title: newTitle,
        due_date: selectedDate,
        color: selectedColor,
      });
      setNewTitle('');
      setSelectedColor(COLORS[0]);
      setSelectedDate(dayjs().format('YYYY-MM-DD'));
      fetchTodos();
    } catch (err) {
      console.error('Failed to add todo', err);
    }
  };

  const togglePin = async (todo: Todo) => {
    try {
      await httpService.patch(`/user-todos/${todo.id}`, {
        is_pinned: !todo.is_pinned,
      });
      fetchTodos();
    } catch (err) {
      console.error('Failed to update todo', err);
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      await httpService.patch(`/user-todos/${todo.id}`, {
        is_completed: !todo.is_completed,
      });
      fetchTodos();
    } catch (err) {
      console.error('Failed to update todo', err);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await httpService.delete(`/user-todos/${id}`);
      fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo', err);
    }
  };

  const TodoCard = ({ todo }: { todo: Todo }) => (
    <div
      className="p-4 rounded-lg shadow-sm border-l-4 cursor-move hover:shadow-md transition-shadow"
      style={{ backgroundColor: todo.color, borderLeftColor: '#333' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3
            className={`font-semibold ${
              todo.is_completed ? 'line-through text-gray-500' : 'text-gray-800'
            }`}
          >
            {todo.title}
          </h3>
          {todo.description && (
            <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
          )}
          {todo.reminder_time && (
            <p className="text-xs text-gray-500 mt-1">
              Reminder: {dayjs(todo.reminder_time).format('HH:mm')}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleComplete(todo)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title={todo.is_completed ? 'Mark incomplete' : 'Mark complete'}
          >
            <FiCheck className={todo.is_completed ? 'text-green-600' : 'text-gray-400'} />
          </button>

          <button
            onClick={() => togglePin(todo)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title={todo.is_pinned ? 'Unpin' : 'Pin'}
          >
            <FiBookmark className={todo.is_pinned ? 'text-amber-600' : 'text-gray-400'} />
          </button>

          <button
            onClick={() => deleteTodo(todo.id)}
            className="p-2 hover:bg-red-200 rounded-lg transition-colors"
            title="Delete"
          >
            <FiTrash2 className="text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <HelmetTitle title="My Tasks" />

      <div className="max-w-2xl mx-auto p-6">
        {/* Add New Todo */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Add New Task</h2>

          <div className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="What do you want to do?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        selectedColor === color
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={addTodo}
              disabled={!newTitle.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FiPlus /> Add Task
            </button>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Today's Todos */}
            {todos.today.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Today ({todos.today.length})
                </h2>
                <div className="grid gap-3">
                  {todos.today.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Todos */}
            {todos.upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Upcoming ({todos.upcoming.length})
                </h2>
                <div className="grid gap-3">
                  {todos.upcoming.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} />
                  ))}
                </div>
              </div>
            )}

            {todos.today.length === 0 && todos.upcoming.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No tasks yet. Add one to get started!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
