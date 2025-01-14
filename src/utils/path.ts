export const removeParams = (pathname: string): void => {
  if (typeof window !== "undefined" && pathname) {
    window.history.replaceState({}, "", pathname);
  }
};
