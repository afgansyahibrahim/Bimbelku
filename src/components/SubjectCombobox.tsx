import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubjectOption {
  id: number;
  name: string;
  group_name?: string;
  education_levels?: string[];
  grades?: string[];
  is_elective?: boolean;
  is_active?: boolean;
}

interface SubjectComboboxProps {
  options: SubjectOption[];
  value: string;
  onChange: (value: string, option?: SubjectOption) => void;
  placeholder?: string;
  educationLevel?: string;
  grade?: string;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<SubjectOption | null>;
  disabled?: boolean;
  className?: string;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

export default function SubjectCombobox({
  options,
  value,
  onChange,
  placeholder = "Pilih mata pelajaran",
  educationLevel,
  grade,
  allowCreate = false,
  onCreate,
  disabled = false,
  className,
}: SubjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const eligible = useMemo(
    () => options.filter((option) => {
      if (option.is_active === false) return false;
      if (educationLevel && option.education_levels?.length && !option.education_levels.includes(educationLevel)) return false;
      if (grade && option.grades?.length && !option.grades.includes(grade)) return false;
      return true;
    }),
    [educationLevel, grade, options],
  );
  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return eligible;
    return eligible.filter((option) => normalize(`${option.name} ${option.group_name || ""}`).includes(needle));
  }, [eligible, query]);
  const exact = options.find((option) => normalize(option.name) === normalize(query));
  const canCreate = allowCreate && query.trim().length >= 2 && !exact;

  const select = (option: SubjectOption) => {
    setQuery(option.name);
    onChange(option.name, option);
    setOpen(false);
  };

  const create = async () => {
    if (!onCreate || !canCreate) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim().replace(/\s+/g, " "));
      if (created) select(created);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className={cn(
        "flex h-12 items-center gap-2 rounded-xl border border-input bg-background px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
      )}>
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls="subject-combobox-options"
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const matchingOption = options.find((option) => normalize(option.name) === normalize(nextQuery));
            setQuery(nextQuery);
            setOpen(true);
            if (matchingOption) {
              onChange(matchingOption.name, matchingOption);
            } else {
              onChange("");
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label={open ? "Tutup daftar mata pelajaran" : "Buka daftar mata pelajaran"}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
        >
          <ChevronDown size={17} className={cn("transition", open && "rotate-180")} />
        </button>
      </div>

      {open && !disabled && (
        <div id="subject-combobox-options" role="listbox" className="absolute z-[120] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          {filtered.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={normalize(value) === normalize(option.name)}
              key={option.id}
              onClick={() => select(option)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-indigo-50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><BookOpen size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800">{option.name}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">{option.group_name || "Mata pelajaran"}</span>
              </span>
              {normalize(value) === normalize(option.name) && <Check size={17} className="text-indigo-600" />}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              disabled={creating}
              onClick={create}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-orange-200 bg-orange-50 px-3 py-3 text-left text-orange-800 hover:bg-orange-100"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-orange-600">
                {creating ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
              </span>
              <span className="text-sm font-black">Tambahkan “{query.trim()}” sebagai mapel baru</span>
            </button>
          )}
          {!filtered.length && !canCreate && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Tidak ada mapel yang cocok untuk kelas ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
