"use client";

import { useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

type Filter = "all" | "active" | "completed";

const STORAGE_KEY = "ravine-todos";

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Todo[];
        if (Array.isArray(parsed)) {
          setTodos(parsed);
        }
      }
    } catch {
      // Ignore malformed local storage data.
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, isLoaded]);

  const visibleTodos = useMemo(() => {
    switch (filter) {
      case "active":
        return todos.filter((todo) => !todo.completed);
      case "completed":
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }, [filter, todos]);

  const remaining = todos.filter((todo) => !todo.completed).length;
  const completed = todos.length - remaining;

  const addTodo = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos((current) => [newTodo, ...current]);
    setInput("");
  };

  const toggleTodo = (id: string) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((current) => current.filter((todo) => !todo.completed));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addTodo();
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0d10] px-4 py-10 text-[#f2efe8]">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[28px] border border-white/10 bg-[#11161b] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#c88a63]">
                Tasks
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">
                My To-Do List
              </h1>
            </div>

            <div className="rounded-full border border-[#c88a63]/35 bg-[#c88a63]/10 px-3 py-2 text-xs font-medium text-[#f6d2b3]">
              {remaining} left
            </div>
          </div>

          <div className="mb-6 flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task..."
              className="h-12 flex-1 rounded-full border border-white/10 bg-[#1a2127] px-4 text-sm text-white outline-none transition placeholder:text-[#8d9397] focus:border-[#c88a63]/60"
            />
            <button
              type="button"
              onClick={addTodo}
              className="h-12 rounded-full bg-[#c88a63] px-5 text-sm font-semibold text-[#140f0d] transition hover:bg-[#d99570]"
            >
              Add
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(["all", "active", "completed"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={[
                  "rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition",
                  filter === item
                    ? "border-[#c88a63] bg-[#c88a63]/15 text-[#f9d1af]"
                    : "border-white/10 bg-transparent text-[#b2b6ba] hover:border-white/20 hover:text-white",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {!isLoaded ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#171d22] px-4 py-5 text-sm text-[#a8afb3]">
                Loading tasks...
              </div>
            ) : visibleTodos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#171d22] px-4 py-10 text-center text-sm text-[#a8afb3]">
                No tasks in this view yet.
              </div>
            ) : (
              visibleTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#171d22] p-3 transition hover:border-[#c88a63]/40"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                    aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                    className={[
                      "grid size-5 place-items-center rounded-full border transition",
                      todo.completed
                        ? "border-[#86d39d] bg-[#86d39d] text-[#09130d]"
                        : "border-[#7a8287] bg-transparent hover:border-[#c88a63]",
                    ].join(" ")}
                  >
                    {todo.completed && <span className="text-[10px] font-black">✓</span>}
                  </button>

                  <p
                    className={[
                      "flex-1 text-sm sm:text-[15px]",
                      todo.completed ? "text-[#7d8589] line-through" : "text-[#f3efe9]",
                    ].join(" ")}
                  >
                    {todo.text}
                  </p>

                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    className="rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#d0d4d6] transition hover:border-[#ff8a7a] hover:text-[#ffb3a9]"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-sm text-[#a8afb3]">
              {completed} completed
            </p>

            <button
              type="button"
              onClick={clearCompleted}
              disabled={completed === 0}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#f3efe9] transition hover:border-[#ff8a7a] hover:text-[#ffb3a9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear completed
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
