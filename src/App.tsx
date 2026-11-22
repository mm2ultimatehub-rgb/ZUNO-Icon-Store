import { AuthProvider } from "./lib/auth";
import { useRoute } from "./lib/router";
import { ToastProvider } from "./lib/toast";
import { supabaseReady } from "./lib/supabase";
import { Shell } from "./components/Shell";
import { EmptyState, GoButton } from "./components/ui";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import IconDetail from "./pages/IconDetail";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";

function Router() {
  const [first = "", second = ""] = useRoute();
  let name = "home";
  let view = <Home />;

  if (!supabaseReady) {
    return (
      <Shell route="home">
        <EmptyState title="Bağlantı yapılandırılmamış" text="Supabase ayarları bulunamadı." />
      </Shell>
    );
  }

  if (first === "icon" && second) {
    name = "icon";
    view = <IconDetail key={second} id={second} />;
  } else if (first === "login") {
    name = "login";
    view = <AuthPage key="login" mode="login" />;
  } else if (first === "register") {
    name = "register";
    view = <AuthPage key="register" mode="register" />;
  } else if (first === "upload") {
    name = "upload";
    view = <Upload />;
  } else if (first === "profile") {
    name = "profile";
    view = <Profile key="me" />;
  } else if (first === "u" && second) {
    name = "user";
    view = <Profile key={second} username={second} />;
  } else if (first !== "") {
    view = <EmptyState title="Sayfa bulunamadı" text="Aradığın sayfa mevcut değil." action={<GoButton to="/">Ana sayfaya dön</GoButton>} />;
  }

  return <Shell route={name}>{view}</Shell>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
