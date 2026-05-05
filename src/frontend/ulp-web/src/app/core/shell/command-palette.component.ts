import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener,
  Input, OnChanges, Output, ViewChild, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Flat representation of a navigable destination — what the palette searches over.
 * Built once from the AppShellComponent's `navGroups` taxonomy and passed in via @Input.
 */
export interface PaletteEntry {
  label: string;       // leaf label, e.g. "Bookings"
  group: string;       // top-level section, e.g. "Operations"
  parent?: string;     // intermediate group, e.g. "Last-Mile Delivery"
  route: string;       // navigable route, e.g. "/app/last-mile/bookings"
  icon?: string;
}

interface ScoredEntry {
  entry: PaletteEntry;
  score: number;
  /** Pre-rendered breadcrumb shown in result row, e.g. "Operations · Last-Mile Delivery" */
  crumb: string;
  /** Match span on label for highlight (start, length); -1 if pure substring miss */
  matchStart: number;
  matchLen: number;
}

@Component({
  selector: 'ulp-command-palette',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="overlay" (click)="close()"></div>
      <div class="palette" role="dialog" aria-label="Quick navigation">
        <div class="palette__input-row">
          <mat-icon class="palette__icon">search</mat-icon>
          <input #input
                 type="text"
                 placeholder="Jump to… (try 'po', 'cod', 'shipment', 'rate card')"
                 [(ngModel)]="query"
                 (ngModelChange)="onQueryChange($event)"
                 (keydown)="onKey($event)"
                 spellcheck="false"
                 autocomplete="off" />
          <kbd class="palette__esc">Esc</kbd>
        </div>

        <div class="palette__results">
          @if (results().length === 0) {
            <div class="palette__empty">
              @if (query.trim()) { No matches for &quot;{{ query }}&quot;. }
              @else { Type to search across {{ entries.length }} pages. ↑↓ to navigate, ↵ to open. }
            </div>
          } @else {
            @for (r of results(); track r.entry.route; let i = $index) {
              <button class="palette__row"
                      [class.palette__row--active]="i === activeIndex()"
                      (mouseenter)="activeIndex.set(i)"
                      (click)="go(r.entry)">
                @if (r.entry.icon) { <mat-icon class="palette__row-icon">{{ r.entry.icon }}</mat-icon> }
                <div class="palette__row-text">
                  <div class="palette__row-label" [innerHTML]="highlight(r.entry.label, r.matchStart, r.matchLen)"></div>
                  <div class="palette__row-crumb">{{ r.crumb }}</div>
                </div>
                <kbd class="palette__row-route">{{ r.entry.route }}</kbd>
              </button>
            }
          }
        </div>

        <div class="palette__hint">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }

    .overlay {
      position: fixed; inset: 0;
      background: rgba(26, 26, 51, 0.35);
      backdrop-filter: blur(2px);
      z-index: 999;
      animation: fade .12s ease-out;
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

    .palette {
      position: fixed; top: 12vh; left: 50%; transform: translateX(-50%);
      width: min(640px, calc(100vw - 32px));
      background: #FFFFFF;
      border: 1px solid #E8E2F4;
      border-radius: 14px;
      box-shadow: 0 24px 64px rgba(63, 45, 124, 0.32);
      z-index: 1000;
      display: flex; flex-direction: column;
      max-height: 70vh;
      animation: pop .14s ease-out;
    }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }

    .palette__input-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #F0EBF8;
    }
    .palette__icon { color: #5B3FA0; }
    .palette__input-row input {
      flex: 1;
      border: none; outline: none; background: transparent;
      font-size: 15px; color: #1A1A33;
      font-family: inherit;
    }
    .palette__input-row input::placeholder { color: #9A9AA3; }
    .palette__esc {
      font-family: inherit; font-size: 11px; font-weight: 600;
      background: #F5F2FB; color: #6B5BA0;
      padding: 2px 7px; border-radius: 4px; border: 1px solid #E8E2F4;
    }

    .palette__results {
      overflow-y: auto;
      flex: 1;
      padding: 6px;
    }
    .palette__empty {
      padding: 24px; text-align: center; color: #9A9AA3; font-size: 13px;
    }
    .palette__row {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      border: none; background: transparent;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      color: #1A1A33;
    }
    .palette__row--active { background: #F5F2FB; }
    .palette__row-icon { color: #5B3FA0; flex-shrink: 0; }
    .palette__row-text { flex: 1; min-width: 0; }
    .palette__row-label { font-size: 14px; font-weight: 600; }
    .palette__row-label :global(mark) {
      background: rgba(229, 74, 138, 0.18); color: inherit;
      padding: 0 1px; border-radius: 2px; font-weight: 700;
    }
    .palette__row-crumb { font-size: 11px; color: #6B5BA0; margin-top: 2px; }
    .palette__row-route {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 11px; color: #6B5BA0;
      background: #F5F2FB; padding: 2px 6px; border-radius: 4px;
      border: 1px solid #E8E2F4;
      flex-shrink: 0;
    }

    .palette__hint {
      display: flex; gap: 16px; justify-content: center;
      padding: 8px 12px; border-top: 1px solid #F0EBF8;
      font-size: 11px; color: #9A9AA3;
    }
    .palette__hint kbd {
      font-family: inherit; font-weight: 600;
      background: #F5F2FB; color: #6B5BA0;
      padding: 1px 5px; border-radius: 3px; border: 1px solid #E8E2F4;
      margin-right: 4px;
    }
  `],
})
export class CommandPaletteComponent implements OnChanges {
  @Input() open = false;
  @Input() entries: PaletteEntry[] = [];
  @Output() closed = new EventEmitter<void>();
  @ViewChild('input') input?: ElementRef<HTMLInputElement>;

  query = '';
  readonly activeIndex = signal(0);

  /** Top 8 results, freshly scored on every query change. */
  readonly results = signal<ScoredEntry[]>([]);

  ngOnChanges() {
    if (this.open) {
      // focus next tick so the input has been rendered
      queueMicrotask(() => this.input?.nativeElement.focus());
      this.refresh();
    }
  }

  onQueryChange(_: string) { this.refresh(); }

  refresh() {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      // No query → show first 8 entries grouped order, gives a starting state.
      const first = this.entries.slice(0, 8).map(e => this.toScored(e, 0, -1, 0));
      this.results.set(first);
      this.activeIndex.set(0);
      return;
    }
    const scored: ScoredEntry[] = [];
    for (const e of this.entries) {
      const labelLower = e.label.toLowerCase();
      const idx = labelLower.indexOf(q);
      let score = -1;
      if (idx === 0) score = 1000;                      // prefix match — highest
      else if (idx > 0) score = 500 - idx;              // substring match — earlier is better
      else if ((e.parent ?? '').toLowerCase().includes(q)) score = 200;  // matches parent label
      else if (e.group.toLowerCase().includes(q)) score = 100;           // matches top group
      // simple fuzzy fallback: every q character must appear in order in label
      else {
        let cursor = 0; let ok = true;
        for (const ch of q) { const f = labelLower.indexOf(ch, cursor); if (f < 0) { ok = false; break; } cursor = f + 1; }
        if (ok) score = 50;
      }
      if (score >= 0) scored.push(this.toScored(e, score, idx, q.length));
    }
    scored.sort((a, b) => b.score - a.score);
    this.results.set(scored.slice(0, 8));
    this.activeIndex.set(0);
  }

  private toScored(entry: PaletteEntry, score: number, matchStart: number, matchLen: number): ScoredEntry {
    return {
      entry, score, matchStart, matchLen,
      crumb: entry.parent ? `${entry.group} · ${entry.parent}` : entry.group,
    };
  }

  /** Render label with the matched span wrapped in <mark>. */
  highlight(label: string, start: number, len: number): string {
    if (start < 0 || len <= 0) return this.escape(label);
    const a = this.escape(label.slice(0, start));
    const b = this.escape(label.slice(start, start + len));
    const c = this.escape(label.slice(start + len));
    return `${a}<mark>${b}</mark>${c}`;
  }
  private escape(s: string): string {
    return s.replace(/[&<>"']/g, c =>
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;');
  }

  onKey(e: KeyboardEvent) {
    const r = this.results();
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex.update(i => Math.min(i + 1, r.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex.update(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')   { e.preventDefault(); const sel = r[this.activeIndex()]; if (sel) this.go(sel.entry); }
    else if (e.key === 'Escape')  { e.preventDefault(); this.close(); }
  }

  @HostListener('document:keydown.escape')
  onDocEscape() { if (this.open) this.close(); }

  go(entry: PaletteEntry) {
    this.router.navigateByUrl(entry.route);
    this.close();
  }

  close() {
    this.query = '';
    this.results.set([]);
    this.closed.emit();
  }

  private readonly router = inject(Router);
}
