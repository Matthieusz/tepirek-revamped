const requireViteEnv = (key: "VITE_SERVER_URL") => {
  const value = import.meta.env[key];

  if (value === undefined || value === "") {
    throw new Error(`${key} is required`);
  }

  return value;
};

export const serverUrl = requireViteEnv("VITE_SERVER_URL");
