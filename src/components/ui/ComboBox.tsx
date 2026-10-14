"use client";

import { useEffect, useRef, useState } from "react";

export interface ComboOption {
  value: string | number;
  label: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * dropdown com busca: digita pra filtrar (sem sensitive a acentos),
 * setas movem o destaque, Enter seleciona, Esc fecha.
 */
export default function ComboBox({
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  width = "w-64",
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  options: ComboOption[];
  placeholder?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const atual = options.find((o) => o.value === value);
  const filtradas = texto.trim()
    ? options.filter((o) => norm(o.label).includes(norm(texto.trim())))
    : options;

  // sincroniza o texto com o valor selecionado quando fechado
  useEffect(() => {
    if (!open) setTexto(atual?.label ?? "");
  }, [open, atual?.label]);

  // fecha ao clicar fora
  useEffect(() => {
    const fecha = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fecha);
    return () => document.removeEventListener("mousedown", fecha);
  }, []);

  const seleciona = (v: string | number) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${width}`}>
      <input
        value={open ? texto : (atual?.label ?? "")}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtradas.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && filtradas[highlight]) {
            e.preventDefault();
            seleciona(filtradas[highlight].value);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {filtradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Nenhum resultado</li>
          )}
          {filtradas.map((o, i) => (
            <li
              key={o.value}
              onMouseDown={(e) => {
                e.preventDefault();
                seleciona(o.value);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlight
                  ? "bg-blue-600 text-white"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
