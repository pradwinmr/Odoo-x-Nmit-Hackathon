import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  Clock,
  LogOut,
  MessageSquarePlus,
  MoreVertical,
  Plus,
  Send,
  Settings,
  Trash2,
  Users,
} from "lucide-react";

/*****
 * SynergySphere – LocalStorage MVP (Desktop + Mobile)
 * ---------------------------------------------------
 * This single-file React app implements a functional MVP:
 * - Register/Login (email + password)
 * - Project CRUD (create, list)
 * - Members: add by email/name; attach existing users if present
 * - Tasks: create, assign, due date, status (To-Do/In Progress/Done)
 * - Project chat with threaded replies
 * - Progress visualization (status breakdown)
 * - Basic notifications (task assignment, due soon, status changes)
 * - Profile & settings (name/email, notification toggle)
 * - Fully responsive UI (Tailwind + shadcn/ui + Recharts)
 *
 * Storage: LocalStorage (STORAGE_KEY). Replace with an API later without touching UI much.
 *****/

// ------------------ Utilities & Storage ------------------
const STORAGE_KEY = "synergySphere.v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function nowISO() {
  return new Date().toISOString();
}

const DEFAULT_DATA = {
  users: [],
  currentUserId: null,
  projects: [],
  tasks: [],
  messages: [], // project messages (threads)
  notifications: [],
  settings: { notificationsEnabled: true },
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to load storage", e);
    return DEFAULT_DATA;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function useLocalStore() {
  const [store, setStore] = useState(loadData);
  useEffect(() => saveData(store), [store]);
  return [store, setStore];
}

// ------------------ Models & Helpers ------------------
const STATUS = {
  todo: { label: "To-Do" },
  inprogress: { label: "In Progress" },
  done: { label: "Done" },
};

function initials(name = "?") {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dateFriendly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function dueSoon(iso) {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  const diff = d - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2; // within 48h
}

// ------------------ Root App ------------------
export default function App() {
  const [store, setStore] = useLocalStore();
  const currentUser = store.users.find((u) => u.id === store.currentUserId) || null;
  const [route, setRoute] = useState(
    currentUser ? { name: "dashboard" } : { name: "auth", mode: "login" }
  );

  // session guard
  useEffect(() => {
    if (!currentUser) setRoute({ name: "auth", mode: "login" });
  }, [store.currentUserId]);

  function signOut() {
    setStore((s) => ({ ...s, currentUserId: null }));
    setRoute({ name: "auth", mode: "login" });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        currentUser={currentUser}
        onProfile={() => setRoute({ name: "profile" })}
        onDashboard={() => setRoute({ name: "dashboard" })}
        onSignOut={signOut}
        store={store}
      />

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {route.name === "auth" && (
            <AuthScreen
              key="auth"
              mode={route.mode}
              onMode={(m) => setRoute({ name: "auth", mode: m })}
              onAuth={(uid) => setStore((s) => ({ ...s, currentUserId: uid }))}
              store={store}
              setStore={setStore}
            />
          )}

          {route.name === "dashboard" && currentUser && (
            <Dashboard
              key="dash"
              store={store}
              setStore={setStore}
              currentUser={currentUser}
              onOpenProject={(pid) => setRoute({ name: "project", id: pid })}
            />)
          }

          {route.name === "project" && currentUser && (
            <ProjectView
              key={route.id}
              store={store}
              setStore={setStore}
              currentUser={currentUser}
              projectId={route.id}
              onBack={() => setRoute({ name: "dashboard" })}
            />
          )}

          {route.name === "profile" && currentUser && (
            <ProfileSettings
              key="profile"
              store={store}
              setStore={setStore}
              currentUser={currentUser}
              onBack={() => setRoute({ name: "dashboard" })}
            />
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

// ------------------ Header & Footer ------------------
function Header({ currentUser, onProfile, onDashboard, onSignOut, store }) {
  const unread = useMemo(
    () => store.notifications.filter((n) => !n.read && n.userId === store.currentUserId).length,
    [store.notifications, store.currentUserId]
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">SS</div>
          <button onClick={onDashboard} className="text-lg md:text-xl font-semibold">SynergySphere</button>
          <Badge className="ml-2">MVP</Badge>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Notifications">
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-rose-600 text-white rounded-full h-4 w-4 grid place-items-center">
                    {unread}
                  </span>
                )}
              </div>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <CircleUser className="h-5 w-5" />
                  <span className="hidden sm:inline">{currentUser.name || currentUser.email}</span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="max-w-[240px] truncate">
                  {currentUser.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onProfile}>
                  <Settings className="h-4 w-4 mr-2" /> Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDashboard}>Dashboard</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-rose-600">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="text-sm px-2">Welcome</div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-8">
      <div className="max-w-7xl mx-auto p-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div>© {new Date().getFullYear()} SynergySphere (MVP)</div>
        <div>Built for clarity • mobile-first • local-only demo</div>
      </div>
    </footer>
  );
}

// ------------------ Auth ------------------
function AuthScreen({ mode = "login", onMode, onAuth, store, setStore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function login() {
    const u = store.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) {
      setError("Invalid credentials");
      return;
    }
    onAuth(u.id);
  }

  function signup() {
    const exists = store.users.some((x) => x.email === email.trim().toLowerCase());
    if (exists) return setError("Email already registered");
    const id = uid("user");
    const user = { id, email: email.trim().toLowerCase(), name: name.trim() || email, password };
    setStore((s) => ({ ...s, users: [...s.users, user], currentUserId: id }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid place-items-center py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </div>
          )}
          <div>
            <label className="text-sm">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@work.com" />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {mode === "login" ? (
              <>
                <Button onClick={login} className="col-span-2">Log in</Button>
                <Button variant="ghost" onClick={() => onMode("signup")}>Create an account</Button>
                <Button variant="ghost">Forgot password</Button>
              </>
            ) : (
              <>
                <Button onClick={signup} className="col-span-2">Sign up</Button>
                <Button variant="ghost" onClick={() => onMode("login")} className="col-span-2">Back to login</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ------------------ Dashboard ------------------
function Dashboard({ store, setStore, currentUser, onOpenProject }) {
  const projects = store.projects.filter((p) => p.members.includes(currentUser.id));
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [name, setName] = useState("");

  function createProject() {
    if (!name.trim()) return;
    const pid = uid("proj");
    const project = {
      id: pid,
      name: name.trim(),
      members: [currentUser.id],
      createdAt: nowISO(),
    };
    setStore((s) => ({ ...s, projects: [project, ...s.projects] }));
    setName("");
    setNewProjectOpen(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Your Projects</h1>
          <p className="text-sm text-slate-600">Quick overview of everything you’re part of.</p>
        </div>
        <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>Give your project a short, clear name.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
            <DialogFooter>
              <Button onClick={createProject}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition border cursor-pointer" onClick={() => onOpenProject(p.id)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{p.name}</span>
                <MoreVertical className="h-4 w-4 opacity-60" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProjectProgressSmall project={p} store={store} />
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Users className="h-4 w-4" /> {p.members.length} member{p.members.length !== 1 ? "s" : ""}
              </div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <EmptyState
            title="No projects yet"
            subtitle="Create your first project to get started."
            action={<Button onClick={() => setNewProjectOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Project</Button>}
          />
        )}
      </div>
    </motion.div>
  );
}

function ProjectProgressSmall({ project, store }) {
  const tasks = store.tasks.filter((t) => t.projectId === project.id);
  const totals = {
    todo: tasks.filter((t) => t.status === "todo").length,
    inprogress: tasks.filter((t) => t.status === "inprogress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const data = [
    { name: "To-Do", value: totals.todo, key: "todo" },
    { name: "In Progress", value: totals.inprogress, key: "inprogress" },
    { name: "Done", value: totals.done, key: "done" },
  ];
  const total = tasks.length || 1;
  const donePct = Math.round((totals.done / total) * 100);

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={35} innerRadius={18}>
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm">
        <div className="font-medium">Progress: {donePct}%</div>
        <div className="text-slate-600">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}

// ------------------ Project View ------------------
function ProjectView({ store, setStore, currentUser, projectId, onBack }) {
  const project = store.projects.find((p) => p.id === projectId);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  if (!project) return <EmptyState title="Project not found" subtitle="Return to dashboard" action={<Button onClick={onBack}>Back</Button>} />;

  const projectTasks = store.tasks.filter((t) => t.projectId === project.id);
  const members = project.members
    .map((uid) => store.users.find((u) => u.id === uid))
    .filter(Boolean);

  function addMember(nameOrEmail) {
    const emailLower = nameOrEmail.trim().toLowerCase();
    let user = store.users.find((u) => u.email === emailLower);
    if (!user) {
      user = { id: uid("user"), email: emailLower, name: nameOrEmail, password: "" };
      setStore((s) => ({ ...s, users: [...s.users, user] }));
    }
    if (!project.members.includes(user.id)) {
      const updated = { ...project, members: [...project.members, user.id] };
      setStore((s) => ({ ...s, projects: s.projects.map((p) => (p.id === project.id ? updated : p)) }));
    }
  }

  function postMessage(parentId = null) {
    if (!chatInput.trim()) return;
    const msg = {
      id: uid("msg"),
      projectId: project.id,
      authorId: currentUser.id,
      content: chatInput.trim(),
      parentId,
      createdAt: nowISO(),
    };
    setStore((s) => ({ ...s, messages: [...s.messages, msg] }));
    setChatInput("");
  }

  const threads = store.messages.filter((m) => m.projectId === project.id && !m.parentId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl md:text-2xl font-bold truncate">{project.name}</h2>
        </div>
        <ProjectMembers members={members} onAdd={addMember} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Tasks board */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tasks</h3>
            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>
              </DialogTrigger>
              <TaskModal
                store={store}
                setStore={setStore}
                project={project}
                open={taskModalOpen}
                onOpenChange={setTaskModalOpen}
                currentUser={currentUser}
              />
            </Dialog>
          </div>

          <TaskBoard store={store} setStore={setStore} project={project} />
        </div>

        {/* Right: Progress & Chat */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Progress</CardTitle></CardHeader>
            <CardContent>
              <ProjectProgressSmall project={project} store={store} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><MessageSquarePlus className="h-5 w-5" /> Project Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {threads.length === 0 && (
                  <div className="text-sm text-slate-500">No messages yet. Start a thread below.</div>
                )}
                {threads.map((t) => (
                  <Thread key={t.id} msg={t} store={store} setStore={setStore} />
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Start a new thread..." onKeyDown={(e) => e.key === 'Enter' && postMessage()} />
                <Button onClick={() => postMessage()} className="gap-2"><Send className="h-4 w-4" /> Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectMembers({ members, onAdd }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.slice(0, 5).map((m) => (
          <Avatar key={m.id} className="h-8 w-8 ring-2 ring-white">
            <AvatarFallback>{initials(m.name || m.email)}</AvatarFallback>
          </Avatar>
        ))}
        {members.length > 5 && (
          <div className="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs">+{members.length - 5}</div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Type an email or name to add to this project.</DialogDescription>
          </DialogHeader>
          <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="teammate@company.com" />
          <DialogFooter>
            <Button onClick={() => { if (val.trim()) { onAdd(val); setVal(""); setOpen(false);} }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Thread({ msg, store, setStore }) {
  const author = store.users.find((u) => u.id === msg.authorId);
  const replies = store.messages.filter((m) => m.parentId === msg.id);
  const [reply, setReply] = useState("");

  function postReply() {
    if (!reply.trim()) return;
    const r = { id: uid("msg"), projectId: msg.projectId, authorId: msg.authorId, content: reply.trim(), parentId: msg.id, createdAt: nowISO() };
    setStore((s) => ({ ...s, messages: [...s.messages, r] }));
    setReply("");
  }

  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7"><AvatarFallback>{initials(author?.name || author?.email)}</AvatarFallback></Avatar>
        <div className="flex-1">
          <div className="text-xs text-slate-500">{author?.name || author?.email} • {new Date(msg.createdAt).toLocaleString()}</div>
          <div className="text-sm mt-1">{msg.content}</div>
        </div>
      </div>
      <div className="pl-9 mt-2 space-y-2">
        {replies.map((r) => {
          const ra = store.users.find((u) => u.id === r.authorId);
          return (
            <div key={r.id} className="flex items-start gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback>{initials(ra?.name || ra?.email)}</AvatarFallback></Avatar>
              <div className="text-xs bg-slate-50 rounded-lg p-2 flex-1">
                <div className="text-slate-500 mb-1">{ra?.name || ra?.email} • {new Date(r.createdAt).toLocaleString()}</div>
                <div>{r.content}</div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." onKeyDown={(e) => e.key === 'Enter' && postReply()} />
          <Button size="sm" onClick={postReply}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ------------------ Tasks ------------------
function TaskBoard({ store, setStore, project }) {
  const columns = ["todo", "inprogress", "done"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {columns.map((col) => (
        <Card key={col} className="bg-white/70">
          <CardHeader className="pb-2"><CardTitle className="text-base">{STATUS[col].label}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {store.tasks
              .filter((t) => t.projectId === project.id && t.status === col)
              .map((t) => (
                <TaskCard key={t.id} task={t} store={store} setStore={setStore} />
              ))}
            {store.tasks.filter((t) => t.projectId === project.id && t.status === col).length === 0 && (
              <div className="text-xs text-slate-500">No tasks</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TaskCard({ task, store, setStore }) {
  const assignee = store.users.find((u) => u.id === task.assigneeId);

  function updateStatus(newStatus) {
    const updated = { ...task, status: newStatus };
    setStore((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === task.id ? updated : t)) }));
    notify(safeUserId(task.assigneeId), `Task \"${task.title}\" marked ${STATUS[newStatus].label}.`, setStore);
  }

  function removeTask() {
    setStore((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }));
  }

  const overdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== "done";

  return (
    <div className={`border rounded-xl p-3 hover:shadow-sm transition ${overdue ? 'border-rose-300' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium truncate">{task.title}</div>
          <div className="text-xs text-slate-600 line-clamp-2">{task.description}</div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <Avatar className="h-6 w-6"><AvatarFallback>{initials(assignee?.name || assignee?.email)}</AvatarFallback></Avatar>
            <span className="text-slate-600">{assignee?.name || assignee?.email}</span>
            <Clock className="h-3.5 w-3.5" /> {dateFriendly(task.dueDate)}
            {dueSoon(task.dueDate) && <Badge>Due soon</Badge>}
            {task.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Change status</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => updateStatus("todo")}>{STATUS.todo.label}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("inprogress")}>{STATUS.inprogress.label}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("done")}>{STATUS.done.label}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600" onClick={removeTask}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TaskModal({ store, setStore, project, open, onOpenChange, currentUser }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState("");

  const members = project.members
    .map((uid) => store.users.find((u) => u.id === uid))
    .filter(Boolean);

  function createTask() {
    if (!title.trim()) return;
    const task = {
      id: uid("task"),
      projectId: project.id,
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      dueDate,
      status: "todo",
      createdAt: nowISO(),
    };
    setStore((s) => ({ ...s, tasks: [task, ...s.tasks] }));
    notify(safeUserId(assigneeId), `You were assigned \"${task.title}\" in ${project.name}.`, setStore);
    setTitle("");
    setDescription("");
    setAssigneeId(currentUser.id);
    setDueDate("");
    onOpenChange(false);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New Task</DialogTitle>
        <DialogDescription>Create and assign a task with a due date.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <label className="text-sm">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write a clear title" />
        </div>
        <div>
          <label className="text-sm">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done?" rows={4} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Assignee</label>
            <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v)}>
              <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">Due date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={createTask} className="gap-2"><Plus className="h-4 w-4" /> Save Task</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ------------------ Profile & Settings ------------------
function ProfileSettings({ store, setStore, currentUser, onBack }) {
  const [name, setName] = useState(currentUser.name || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    store.settings.notificationsEnabled
  );

  function save() {
    setStore((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === currentUser.id ? { ...u, name } : u)),
      settings: { ...s.settings, notificationsEnabled },
    }));
    onBack();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-2" /> Back</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm">Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <Input value={currentUser.email} disabled />
          </div>
          <div className="flex items-center justify-between border rounded-xl p-3">
            <div>
              <div className="font-medium">Notifications</div>
              <div className="text-sm text-slate-600">Enable basic in-app notifications</div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          <div className="pt-2">
            <Button onClick={save} className="w-full">Save changes</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ------------------ Notifications ------------------
function notify(userId, text, setStore) {
  if (!userId) return;
  const notif = { id: uid("ntf"), userId, text, createdAt: nowISO(), read: false };
  setStore((s) => ({ ...s, notifications: [notif, ...s.notifications] }));
}
function safeUserId(id) { return id || null; }

// ------------------ Generic Empty State ------------------
function EmptyState({ title, subtitle, action }) {
  return (
    <div className="col-span-full border rounded-2xl p-8 grid place-items-center text-center bg-white">
      <div className="max-w-sm space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
        <div className="pt-2">{action}</div>
      </div>
    </div>
  );
}
