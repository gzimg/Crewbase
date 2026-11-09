import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/me";
import type { NextPage } from "next";
import Landing, { LandingMode } from "@/components/landing";

/**
 * The main page of the site. Everyone sees the Crewbase homepage here,
 * logged in or not. Logged-in users get a button to their workspaces,
 * which now live at /workspaces.
 */
const Home: NextPage = () => {
  const [mode, setMode] = useState<LandingMode>("login");
  const [user, setUser] = useState<{ displayname?: string; thumbnail?: string }>({});

  useEffect(() => {
    fetchMe()
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          setMode("loggedIn");
        }
      })
      .catch((err) => {
        if (err.response?.data?.error === "Workspace not setup") setMode("setup");
      });
  }, []);

  return <Landing mode={mode} displayName={user.displayname} avatar={user.thumbnail} />;
};

export default Home;
