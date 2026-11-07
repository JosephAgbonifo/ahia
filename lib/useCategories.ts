"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { Category } from "./shop";

let cache: Promise<Category[]> | null = null;

/** Call after an admin changes categories so the next read is fresh. */
export function resetCategories() {
  cache = null;
}

function loadCategories() {
  cache ??= api
    .get<{ categories: Category[] }>("/categories")
    .then((d) => d.categories)
    .catch((e) => {
      cache = null; // allow a retry next time
      throw e;
    });
  return cache;
}

/** Category tree, fetched once per page load and shared by header, home and filters. */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadCategories()
      .then((c) => alive && setCategories(c))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading };
}
