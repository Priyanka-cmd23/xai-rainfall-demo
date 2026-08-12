import React, { useEffect, useRef, useState } from "react";
import { searchCities } from "./weather";

const QUICK_PLACES = [
  "Vadodara",
  "Bareilly",
  "Delhi",
  "Ahmedabad",
  "Lucknow",
  "Paris",
  "Berlin",
  "Rome"
];

function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const list = await searchCities(query, controller.signal);
        setResults(list);
        setActiveIndex(-1);
        setSearching(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          setResults([]);
          setSearching(false);
        }
      }
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const choose = (place) => {
    onSelect(place);
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const chooseNamed = async (name) => {
    setResolving(name);
    try {
      const list = await searchCities(name);
      if (list.length) choose(list[0]);
    } finally {
      setResolving("");
    }
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <label className="location-field">
      <span className="eyebrow">SEARCH A PLACE</span>
      <span className="search-box">
        <input
          className="search-input"
          type="text"
          value={query}
          placeholder="City or region…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search a place"
          autoComplete="off"
        />
        <i className={`search-status ${searching ? "spin" : ""}`}>⌕</i>
      </span>

      {open && results.length > 0 && (
        <span className="suggestions" role="listbox">
          {results.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              className={`suggestion ${i === activeIndex ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              role="option"
              aria-selected={i === activeIndex}
            >
              <b>{p.name}</b>
              <small>{[p.admin1, p.country].filter(Boolean).join(" · ")}</small>
            </button>
          ))}
        </span>
      )}

      <span className="quick-row">
        {QUICK_PLACES.map((p) => (
          <button
            key={p}
            className="quick-chip"
            disabled={resolving === p}
            onClick={() => chooseNamed(p)}
          >
            {resolving === p ? "…" : p}
          </button>
        ))}
      </span>
    </label>
  );
}

export default LocationSearch;