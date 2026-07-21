import { useEffect, useState } from "react";
import { api } from "./api";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState({});

  useEffect(() => {
    let cancelled = false;
    api
      .get("/categories")
      .then((data) => {
        if (cancelled) return;
        setCategories(data.defaultCategories);
        setColors(data.categoryColors);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, colors };
}
