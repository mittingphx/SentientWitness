import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import Project from "@/pages/project";
import JoinSession from "@/pages/join-session";
import NotFound from "@/pages/not-found";
import { useStore } from "./lib/store";

function App() {
  const [loaded, setLoaded] = useState(false);
  const { initializeStore } = useStore();

  useEffect(() => {
    // Initialize the store with data from localStorage
    initializeStore();
    setLoaded(true);
  }, [initializeStore]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-400">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="font-sans antialiased">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/project/:id" component={Project} />
          <Route path="/join/:sessionId" component={JoinSession} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
