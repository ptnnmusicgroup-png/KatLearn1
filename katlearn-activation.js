// Feature activation bridge: wires the already-built AI UI into KatLearn without replacing existing learning flows.
function installThemeRuntime(){
    if(window.katlearnTheme?.apply)return;
    const themes={
      default:{accent:'#6d5efc',accent2:'#8c7eff',bg:'#f7f8fc',surface:'#ffffff',surface2:'#fbfbfe',text:'#24364b',muted:'#8290a3',line:'#ebedf4',soft:'#f1efff',top:'#ffffff',meta:'#f6f7fb',hero1:'#6153ef',hero2:'#a296fc',shadow:'rgba(44,54,94,.08)',themeColor:'#f7f5ff'},
      night:{accent:'#a99cff',accent2:'#f39bb1',bg:'#141327',surface:'#211f38',surface2:'#2a2745',text:'#f6f2ff',muted:'#b7aecb',line:'rgba(255,255,255,.10)',soft:'rgba(169,156,255,.16)',top:'rgba(27,24,49,.94)',meta:'rgba(255,255,255,.08)',hero1:'#40356f',hero2:'#8d5d86',shadow:'rgba(0,0,0,.25)',themeColor:'#17152f'},
      sky:{accent:'#3289c7',accent2:'#79c8ee',bg:'#eef8ff',surface:'rgba(255,255,255,.82)',surface2:'#f7fcff',text:'#25445c',muted:'#71889a',line:'rgba(79,145,183,.15)',soft:'#e8f5fc',top:'rgba(255,255,255,.86)',meta:'rgba(255,255,255,.72)',hero1:'#4b9fd1',hero2:'#8bcfed',shadow:'rgba(38,98,133,.10)',themeColor:'#9edcff'},
      pink:{accent:'#d65c8a',accent2:'#f39fbd',bg:'#fff4f8',surface:'rgba(255,255,255,.86)',surface2:'#fff9fb',text:'#563446',muted:'#987985',line:'rgba(214,92,138,.14)',soft:'#fff0f5',top:'rgba(255,255,255,.88)',meta:'rgba(255,255,255,.74)',hero1:'#d66392',hero2:'#f5b2c8',shadow:'rgba(158,73,110,.10)',themeColor:'#ffd6e1'},
      ocean:{accent:'#177f90',accent2:'#54c7d0',bg:'#ebfbf8',surface:'rgba(255,255,255,.84)',surface2:'#f6fffd',text:'#214b58',muted:'#718f98',line:'rgba(23,127,144,.14)',soft:'#e5f8f7',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.73)',hero1:'#258d9d',hero2:'#64c9cf',shadow:'rgba(27,107,119,.10)',themeColor:'#74d7df'},
      lavender:{accent:'#6f63b8',accent2:'#a9a0e8',bg:'#f5f1ff',surface:'rgba(255,255,255,.84)',surface2:'#fbf9ff',text:'#433c65',muted:'#857ea0',line:'rgba(111,99,184,.15)',soft:'#efecff',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.72)',hero1:'#786cc8',hero2:'#b6afea',shadow:'rgba(86,73,143,.10)',themeColor:'#d8d1ff'},
      'sen-viet':{accent:'#5b9b83',accent2:'#786ccc',bg:'#fbf7ef',surface:'rgba(255,255,255,.80)',surface2:'#fffaf2',text:'#3f4751',muted:'#7d7f86',line:'rgba(91,155,131,.16)',soft:'#edf6f1',top:'rgba(255,252,246,.84)',meta:'rgba(255,255,255,.70)',hero1:'#5b9b83',hero2:'#786ccc',shadow:'rgba(83,91,86,.10)',themeColor:'#fffaf2'}
    };
    const css=document.createElement('style');
    css.id='katlearn-theme-runtime';
    css.textContent=`
      body[data-kat-theme]{background-color:var(--kl-theme-bg)!important;background-image:var(--kl-theme-background)!important;background-size:cover!important;background-attachment:fixed!important;background-position:center!important;color:var(--kl-theme-text)!important}
      body[data-kat-theme] .app-shell,body[data-kat-theme] main{background:transparent!important}
      body[data-kat-theme] .sidebar{background:var(--kl-theme-top)!important;border-right-color:var(--kl-theme-line)!important;box-shadow:12px 0 40px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .topbar{background:var(--kl-theme-top)!important;border-bottom-color:var(--kl-theme-line)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}
      body[data-kat-theme] .brand,body[data-kat-theme] h1,body[data-kat-theme] h2,body[data-kat-theme] h3,body[data-kat-theme] .card-title h3,body[data-kat-theme] .pack-summary b,body[data-kat-theme] .word-summary b{color:var(--kl-theme-text)!important}
      body[data-kat-theme] p,body[data-kat-theme] small,body[data-kat-theme] .subtext,body[data-kat-theme] .muted,body[data-kat-theme] .activity-card small,body[data-kat-theme] .section-heading p{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .brand span span,body[data-kat-theme] .nav-item:hover,body[data-kat-theme] .nav-item.active,body[data-kat-theme] .eyebrow,body[data-kat-theme] .card-title button,body[data-kat-theme] .rank-tabs .active{color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .nav-item{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .nav-item:hover,body[data-kat-theme] .nav-item.active{background:var(--kl-theme-soft)!important}
      body[data-kat-theme] .search{background:var(--kl-theme-meta)!important;color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .streak-card,body[data-kat-theme] .activity-card,body[data-kat-theme] .daily-goal,body[data-kat-theme] .mini-ranking,body[data-kat-theme] .word-list,body[data-kat-theme] .mode-card,body[data-kat-theme] .quiz-panel,body[data-kat-theme] .stat-grid>div,body[data-kat-theme] .chart-card,body[data-kat-theme] .weak-card,body[data-kat-theme] .ranking-list,body[data-kat-theme] .rank-tabs,body[data-kat-theme] .shop-grid article,body[data-kat-theme] .shop-theme-card,body[data-kat-theme] .published-packs,body[data-kat-theme] .personal-pack-card,body[data-kat-theme] .learn-summary,body[data-kat-theme] .flash-stage,body[data-kat-theme] .test-card,body[data-kat-theme] .test-hero,body[data-kat-theme] .result-card,body[data-kat-theme] .cp-hero-card,body[data-kat-theme] .cp-account,body[data-kat-theme] .cp-card,body[data-kat-theme] .auth-screen .card{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;box-shadow:0 14px 40px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .student-pack-head,body[data-kat-theme] .student-pack-row input,body[data-kat-theme] .student-pack-row select,body[data-kat-theme] .cp-field input,body[data-kat-theme] .cp-field textarea,body[data-kat-theme] .cp-field select{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .hero-card{background:linear-gradient(135deg,var(--kl-theme-hero1),var(--kl-theme-hero2))!important;box-shadow:0 18px 42px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .primary-btn,body[data-kat-theme] .know-btn,body[data-kat-theme] .cp-btn.primary,body[data-kat-theme] .shop-theme-card .shop-apply-theme{background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;color:#fff!important}
      body[data-kat-theme] .activity-card:hover,body[data-kat-theme] .mode-card:hover,body[data-kat-theme] .mode-card.active-mode,body[data-kat-theme] .student-pack-row input:focus,body[data-kat-theme] .student-pack-row select:focus,body[data-kat-theme] .cp-field input:focus,body[data-kat-theme] .cp-field textarea:focus,body[data-kat-theme] .cp-field select:focus{border-color:var(--kl-theme-accent)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--kl-theme-accent) 12%,transparent)!important}
      /* Unified theme button layer: one source of truth for button surfaces and contrast. */
      body[data-kat-theme] button,
      body[data-kat-theme] input[type="button"],
      body[data-kat-theme] input[type="submit"]{
        border-color:var(--kl-theme-line);
        transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease,opacity .18s ease!important;
      }
      body[data-kat-theme] .primary-btn,
      body[data-kat-theme] .add-word-btn,
      body[data-kat-theme] .create-pack-btn,
      body[data-kat-theme] .login-btn,
      body[data-kat-theme] .settings-save,
      body[data-kat-theme] .cp-btn.primary,
      body[data-kat-theme] .student-pack-save-btn,
      body[data-kat-theme] .test-start:not(:disabled),
      body[data-kat-theme] .test-submit:not(:disabled),
      body[data-kat-theme] .test-next,
      body[data-kat-theme] .result-actions .primary,
      body[data-kat-theme] .shop-theme-card .shop-apply-theme{
        background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;
        color:#fff!important;
        border-color:transparent!important;
        box-shadow:0 10px 24px var(--kl-theme-shadow)!important;
      }
      body[data-kat-theme] .learn-tool-btn,
      body[data-kat-theme] .published-pack button,
      body[data-kat-theme] .pack-tile button,
      body[data-kat-theme] .personal-pack-card button,
      body[data-kat-theme] .word-table-tools button,
      body[data-kat-theme] .kat-library-leaf-card button,
      body[data-kat-theme] .student-pack-wide-btn,
      body[data-kat-theme] .cp-add,
      body[data-kat-theme] .flash-nav-btn,
      body[data-kat-theme] .flash-main-btn,
      body[data-kat-theme] .card-icon-btn,
      body[data-kat-theme] .settings-back,
      body[data-kat-theme] .settings-cancel,
      body[data-kat-theme] .account-menu-btn,
      body[data-kat-theme] .cp-btn.secondary,
      body[data-kat-theme] .shop-theme-card .shop-buy-theme,
      body[data-kat-theme] .pack-actions button,
      body[data-kat-theme] .result-actions button:not(.primary),
      body[data-kat-theme] #selectAll,
      body[data-kat-theme] #clearAll,
      body[data-kat-theme] #retryTest{
        background:var(--kl-theme-surface)!important;
        color:var(--kl-theme-accent)!important;
        border:1px solid var(--kl-theme-line)!important;
        box-shadow:0 7px 18px var(--kl-theme-shadow)!important;
      }
      body[data-kat-theme] .learn-tool-btn:hover,
      body[data-kat-theme] .published-pack button:hover,
      body[data-kat-theme] .pack-tile button:hover,
      body[data-kat-theme] .personal-pack-card button:hover,
      body[data-kat-theme] .word-table-tools button:hover,
      body[data-kat-theme] .kat-library-leaf-card button:hover,
      body[data-kat-theme] .student-pack-wide-btn:hover,
      body[data-kat-theme] .cp-add:hover,
      body[data-kat-theme] .flash-nav-btn:hover,
      body[data-kat-theme] .flash-main-btn:hover,
      body[data-kat-theme] .card-icon-btn:hover,
      body[data-kat-theme] .settings-back:hover,
      body[data-kat-theme] .settings-cancel:hover,
      body[data-kat-theme] .account-menu-btn:hover,
      body[data-kat-theme] .cp-btn.secondary:hover,
      body[data-kat-theme] .shop-theme-card .shop-buy-theme:hover,
      body[data-kat-theme] .pack-actions button:hover,
      body[data-kat-theme] .result-actions button:not(.primary):hover,
      body[data-kat-theme] #selectAll:hover,
      body[data-kat-theme] #clearAll:hover,
      body[data-kat-theme] #retryTest:hover{
        background:var(--kl-theme-soft)!important;
        border-color:var(--kl-theme-accent)!important;
      }
      body[data-kat-theme] .learn-back,
      body[data-kat-theme] .revision-exam-home-cta,
      body[data-kat-theme] .account-menu-btn.danger,
      body[data-kat-theme] .account-trigger,
      body[data-kat-theme] .settings-btn,
      body[data-kat-theme] .notification,
      body[data-kat-theme] .menu-toggle,
      body[data-kat-theme] .test-menu-toggle{
        background:transparent!important;
        color:var(--kl-theme-text)!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }
      body[data-kat-theme] .pack-tabs button,
      body[data-kat-theme] .cp-mode-tab,
      body[data-kat-theme] #practice .reflex-source-option,
      body[data-kat-theme] #practice .reflex-length{
        background:var(--kl-theme-surface)!important;
        color:var(--kl-theme-muted)!important;
        border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .pack-tabs button.active,
      body[data-kat-theme] .cp-mode-tab.active,
      body[data-kat-theme] #practice .reflex-source-option.active,
      body[data-kat-theme] #practice .reflex-length.active{
        background:var(--kl-theme-soft)!important;
        color:var(--kl-theme-accent)!important;
        border-color:color-mix(in srgb,var(--kl-theme-accent) 45%,transparent)!important;
        box-shadow:0 7px 18px var(--kl-theme-shadow)!important;
      }
      body[data-kat-theme] #practice .reflex-skip{
        background:var(--kl-theme-surface)!important;
        color:var(--kl-theme-accent)!important;
        border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .flash-result-btn.unsure{
        background:color-mix(in srgb,#f6cf7a 15%,var(--kl-theme-surface))!important;
        color:#a16d23!important;
        border-color:color-mix(in srgb,#d59c31 28%,var(--kl-theme-line))!important;
      }
      body[data-kat-theme] .flash-result-btn.known{
        background:color-mix(in srgb,#4bb487 14%,var(--kl-theme-surface))!important;
        color:#2f8664!important;
        border-color:color-mix(in srgb,#4bb487 28%,var(--kl-theme-line))!important;
      }
      body[data-kat-theme] .modal-close{
        background:var(--kl-theme-soft)!important;
        color:var(--kl-theme-text)!important;
        border:1px solid var(--kl-theme-line)!important;
      }
      body[data-kat-theme] button:disabled,
      body[data-kat-theme] input[type="submit"]:disabled{
        background:color-mix(in srgb,var(--kl-theme-surface) 86%,var(--kl-theme-muted))!important;
        color:var(--kl-theme-muted)!important;
        border-color:var(--kl-theme-line)!important;
        box-shadow:none!important;
      }
      body[data-kat-theme] button:focus-visible,
      body[data-kat-theme] input:focus-visible{
        outline:3px solid color-mix(in srgb,var(--kl-theme-accent) 24%,transparent)!important;
        outline-offset:2px;
      }
      body[data-kat-theme="night"] .learn-tool-btn,
      body[data-kat-theme="night"] .flash-nav-btn,
      body[data-kat-theme="night"] .flash-main-btn,
      body[data-kat-theme="night"] .card-icon-btn,
      body[data-kat-theme="night"] .settings-back,
      body[data-kat-theme="night"] .settings-cancel,
      body[data-kat-theme="night"] .account-menu-btn,
      body[data-kat-theme="night"] .cp-btn.secondary,
      body[data-kat-theme="night"] .shop-theme-card .shop-buy-theme,
      body[data-kat-theme="night"] .pack-actions button,
      body[data-kat-theme="night"] .result-actions button:not(.primary),
      body[data-kat-theme="night"] #selectAll,
      body[data-kat-theme="night"] #clearAll,
      body[data-kat-theme="night"] #retryTest{
        background:#2a2745!important;
      }
      body[data-kat-theme] .coin-pill,body[data-kat-theme] .coin-earned{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-line)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .word-item.selected,body[data-kat-theme] .rank-row.you,body[data-kat-theme] .rank-list-row.mine{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .quiz-badge,body[data-kat-theme] .mode-card span,body[data-kat-theme] .word-list h3 span{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .quiz-progress i,body[data-kat-theme] .progress-line span,body[data-kat-theme] .bar-chart .today-bar{background:linear-gradient(90deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .flashcard .card-front{background:linear-gradient(145deg,var(--kl-theme-hero1),var(--kl-theme-hero2))!important}
      body[data-kat-theme] .flashcard .card-back{background:linear-gradient(145deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .flashcard .card-face h2,body[data-kat-theme] .flashcard .card-face p,body[data-kat-theme] .flashcard .word-type{color:#fff!important}
      body[data-kat-theme] .modal-card,body[data-kat-theme] .student-pack-modal,body[data-kat-theme] .kl-pack-card{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] input,body[data-kat-theme] textarea,body[data-kat-theme] select{color:var(--kl-theme-text)}
      body[data-kat-theme] .site-footer,body[data-kat-theme] #katlearnFooter{background:color-mix(in srgb,var(--kl-theme-surface) 78%,transparent)!important;border-top-color:var(--kl-theme-line)!important}
      body[data-kat-theme="night"] .vn-ui-motif{opacity:.35!important}
      body[data-kat-theme="sen-viet"] .hero-card{box-shadow:0 18px 42px rgba(91,155,131,.16)!important}
      body[data-kat-theme="sen-viet"] .brand-mark{background:linear-gradient(135deg,#5b9b83,#786ccc)!important}
      body[data-kat-theme="night"] .brand-mark{background:linear-gradient(135deg,#5f5495,#b06d84)!important}
      body[data-kat-theme="ocean"] .activity-card .activity-icon{background:#dff7f4!important}
      body[data-kat-theme="sky"] .activity-card .activity-icon{background:#e4f4fc!important}
      body[data-kat-theme="pink"] .activity-card .activity-icon{background:#ffeaf2!important}
      body[data-kat-theme="lavender"] .activity-card .activity-icon{background:#eeeaff!important}
      body[data-kat-theme="night"] .activity-card .activity-icon{background:rgba(255,255,255,.08)!important;color:var(--kl-theme-accent)!important}

      /* Standalone page parity */
      body[data-kat-theme] .test-top-actions a,body[data-kat-theme] .ghost-btn,
      body[data-kat-theme] .test-sidebar-brand,body[data-kat-theme] .test-sidebar nav a,
      body[data-kat-theme] .test-timer,body[data-kat-theme] .test-type,
      body[data-kat-theme] .pack-actions button,body[data-kat-theme] .pack-check-ui,
      body[data-kat-theme] .test-option,body[data-kat-theme] .test-example,
      body[data-kat-theme] .result-stat,body[data-kat-theme] .result-review{
        background:var(--kl-theme-surface)!important;
        color:var(--kl-theme-text)!important;
        border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .test-sidebar{background:var(--kl-theme-top)!important;border-right-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .test-sidebar nav a.active{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .test-subtitle,body[data-kat-theme] .test-question-label,body[data-kat-theme] .test-pron,
      body[data-kat-theme] .test-feedback,body[data-kat-theme] .test-run-note,body[data-kat-theme] .test-hint,
      body[data-kat-theme] .pack-toolbar-note,body[data-kat-theme] .pack-check-info span,body[data-kat-theme] .test-counter,
      body[data-kat-theme] .test-score,body[data-kat-theme] .test-foot,body[data-kat-theme] .result-stat span{
        color:var(--kl-theme-muted)!important;
      }
      body[data-kat-theme] .test-hero{background:linear-gradient(135deg,var(--kl-theme-surface),color-mix(in srgb,var(--kl-theme-surface2) 75%,var(--kl-theme-soft)))!important}
      body[data-kat-theme] .test-hero-badge{background:var(--kl-theme-meta)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .test-start,body[data-kat-theme] .test-submit,body[data-kat-theme] .test-next{
        background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;color:#fff!important;
      }
      body[data-kat-theme] .test-progress-wrap{background:var(--kl-theme-meta)!important}
      body[data-kat-theme] .test-progress{background:linear-gradient(90deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .pack-check input:checked+.pack-check-ui{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .pack-check-mark{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-muted)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .pack-check input:checked+.pack-check-ui .pack-check-mark{background:var(--kl-theme-accent)!important;border-color:var(--kl-theme-accent)!important;color:#fff!important}
      body[data-kat-theme] .test-option.selected{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .test-option-key{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .test-option.selected .test-option-key{background:var(--kl-theme-accent)!important;color:#fff!important}
      body[data-kat-theme] .test-option.correct,body[data-kat-theme] .revision-exam-answer.correct{border-color:#68b88f!important;background:color-mix(in srgb,#4bb487 10%,var(--kl-theme-surface))!important}
      body[data-kat-theme] .test-option.wrong,body[data-kat-theme] .revision-exam-answer.wrong{border-color:#df8794!important;background:color-mix(in srgb,#df697d 9%,var(--kl-theme-surface))!important}
      body[data-kat-theme] .result-ring{background:conic-gradient(var(--kl-theme-accent) var(--score,0%),var(--kl-theme-meta) 0)!important}
      body[data-kat-theme] .result-ring:after{background:var(--kl-theme-surface)!important}
      body[data-kat-theme] .test-toast{background:var(--kl-theme-text)!important;color:var(--kl-theme-bg)!important}
      body[data-kat-theme] .test-toast.error{background:#a34a57!important;color:#fff!important}

      body[data-kat-theme] .cp-back{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-back:hover{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .cp-eyebrow,body[data-kat-theme] .cp-helper,body[data-kat-theme] .cp-count,body[data-kat-theme] .cp-account-email,
      body[data-kat-theme] .cp-card-title p,body[data-kat-theme] .cp-name-wrap small,body[data-kat-theme] .cp-locked p,
      body[data-kat-theme] .cp-loading-card small{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .cp-mode-tabs{background:var(--kl-theme-meta)!important;border:1px solid var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-mode-tab{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .cp-mode-tab.active{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .cp-status{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .cp-status-dot{background:var(--kl-theme-accent)!important;box-shadow:0 0 0 5px color-mix(in srgb,var(--kl-theme-accent) 13%,transparent)!important}
      body[data-kat-theme] .cp-name-wrap,body[data-kat-theme] .cp-pill{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-line)!important;color:var(--kl-theme-text)!important}
      body[data-kat-theme] .cp-table,body[data-kat-theme] .cp-table-head,body[data-kat-theme] .cp-row{border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-table{background:var(--kl-theme-surface)!important}
      body[data-kat-theme] .cp-table-head{background:var(--kl-theme-meta)!important;color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .cp-row:nth-child(even){background:color-mix(in srgb,var(--kl-theme-surface2) 82%,var(--kl-theme-soft))!important}
      body[data-kat-theme] .cp-num{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .cp-input,body[data-kat-theme] .cp-select{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-icon-btn{background:var(--kl-theme-surface)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-icon-btn.remove{color:#c96b78!important}
      body[data-kat-theme] .cp-add{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-footer{background:linear-gradient(180deg,var(--kl-theme-meta),var(--kl-theme-surface))!important;border-top-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-alert{background:color-mix(in srgb,#ef6b73 8%,var(--kl-theme-surface))!important;color:#ad5d67!important;border-color:color-mix(in srgb,#ef6b73 22%,var(--kl-theme-line))!important}
      body[data-kat-theme] .cp-loading{background:color-mix(in srgb,var(--kl-theme-bg) 78%,transparent)!important}
      body[data-kat-theme] .cp-loading-card{background:var(--kl-theme-surface)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .cp-spinner{border-color:var(--kl-theme-line)!important;border-top-color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .cp-locked-icon{background:color-mix(in srgb,#ef6b73 9%,var(--kl-theme-surface))!important}

      body[data-kat-theme] .settings-brand-mark,body[data-kat-theme] .profile-avatar,body[data-kat-theme] .profile-preview,
      body[data-kat-theme] .account-code-field,body[data-kat-theme] .locked-card,body[data-kat-theme] .settings-toast{
        border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .settings-brand-mark,body[data-kat-theme] .profile-avatar{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .profile-preview,body[data-kat-theme] .account-code-field{background:var(--kl-theme-soft)!important;color:var(--kl-theme-text)!important}
      body[data-kat-theme] .settings-card label,body[data-kat-theme] .settings-card label span{color:var(--kl-theme-text)!important}
      body[data-kat-theme] .settings-card label span{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .settings-card input{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .settings-card input:disabled{background:var(--kl-theme-meta)!important;color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .settings-status,body[data-kat-theme] .locked-card p{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .locked-icon{background:color-mix(in srgb,#ef6b73 9%,var(--kl-theme-surface))!important}
      body[data-kat-theme] .settings-toast{background:var(--kl-theme-text)!important;color:var(--kl-theme-bg)!important}

      /* AI modal and custom personal-pack editor */
      body[data-kat-theme] #aiPackModal .ai-pack-container,body[data-kat-theme] #packPreviewModal .pack-preview-container{
        background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;
        box-shadow:0 32px 100px var(--kl-theme-shadow)!important;
      }
      body[data-kat-theme] #aiPackModal .ai-pack-header,body[data-kat-theme] #packPreviewModal .preview-header{
        background:var(--kl-theme-top)!important;border-bottom-color:var(--kl-theme-line)!important;color:var(--kl-theme-text)!important;
      }
      body[data-kat-theme] #aiPackModal input,body[data-kat-theme] #aiPackModal select,body[data-kat-theme] #aiPackModal textarea,
      body[data-kat-theme] #packPreviewModal input,body[data-kat-theme] #packPreviewModal textarea{
        background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] #aiPackModal .mode-grid .mode-card,
      body[data-kat-theme] #packPreviewModal .word-item{
        background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] #aiPackModal .btn-secondary,body[data-kat-theme] #packPreviewModal .btn-secondary{
        background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] #aiPackModal .btn-primary,body[data-kat-theme] #aiPackModal .btn-primary-large,
      body[data-kat-theme] #packPreviewModal .btn-primary,body[data-kat-theme] #packPreviewModal .btn-large{
        background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;color:#fff!important;border-color:transparent!important;
      }
      body[data-kat-theme] #aiPackModal .modal-close,body[data-kat-theme] #packPreviewModal .modal-close{
        background:var(--kl-theme-soft)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .student-pack-title-icon,body[data-kat-theme] .reflex-section-icon{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .student-pack-flow span,body[data-kat-theme] .reflex-pack-card{
        background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .student-pack-flow span.active,body[data-kat-theme] .reflex-pack-card.selected{
        background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-accent)!important;
      }
      body[data-kat-theme] .student-pack-create-panel,body[data-kat-theme] .reflex-pack-section{
        background:var(--kl-theme-surface2)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .student-pack-section-label b,body[data-kat-theme] .student-pack-step-kicker b,
      body[data-kat-theme] .student-pack-section-label small,body[data-kat-theme] .student-pack-step-kicker small,
      body[data-kat-theme] .reflex-pack-section-head p,body[data-kat-theme] .reflex-pack-card-copy small{
        color:var(--kl-theme-muted)!important;
      }
      body[data-kat-theme] .student-pack-field,body[data-kat-theme] .student-pack-ai-controls label{color:var(--kl-theme-text)!important}
      body[data-kat-theme] .student-pack-footer{background:var(--kl-theme-top)!important;border-top-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .student-pack-count b{color:var(--kl-theme-accent)!important}

      /* Revision exam */
      body[data-kat-theme] .revision-exam-kicker,body[data-kat-theme] .revision-exam-badge{
        background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important;border-color:var(--kl-theme-line)!important;
      }
      body[data-kat-theme] .revision-exam-hero p,body[data-kat-theme] .revision-exam-field span,
      body[data-kat-theme] .revision-exam-feedback,body[data-kat-theme] .revision-exam-score,
      body[data-kat-theme] .revision-exam-result p,body[data-kat-theme] .revision-exam-result-stats span,
      body[data-kat-theme] .revision-exam-wrong h3,body[data-kat-theme] .revision-exam-empty,
      body[data-kat-theme] .revision-exam-home-cta small{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .revision-exam-field select,body[data-kat-theme] .revision-exam-answer,
      body[data-kat-theme] .revision-exam-wrong-item{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .revision-exam-note,body[data-kat-theme] .revision-exam-context,
      body[data-kat-theme] .revision-exam-result-stats div,body[data-kat-theme] .revision-exam-empty,
      body[data-kat-theme] .revision-exam-home-cta{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-line)!important;color:var(--kl-theme-text)!important}
      body[data-kat-theme] .revision-exam-progress{background:var(--kl-theme-meta)!important}
      body[data-kat-theme] .revision-exam-progress i{background:linear-gradient(90deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .revision-exam-next,body[data-kat-theme] .revision-exam-restart,body[data-kat-theme] .revision-exam-open-pack{
        background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;color:#fff!important;
      }
      body[data-kat-theme] .revision-exam-home-icon{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      `;
    document.head.appendChild(css);
    const assets={
      night:'/assets/1/bg-cat-night.svg',sky:'/assets/1/bg-sky.svg',pink:'/assets/1/bg-pink.svg',
      ocean:'/assets/1/bg-ocean.svg',lavender:'/assets/1/bg-lavender.svg','sen-viet':'/assets/1/bg-sen-viet.svg'
    };
    function apply(raw,{persist=true}={}){
      const requested=String(raw||'default').replace(/^theme-/,'').trim();
      const id=themes[requested]?requested:'default';
      const t=themes[id];
      const root=document.documentElement;
      const body=document.body;
      if(!body)return id;
      root.style.setProperty('--kl-theme-bg',t.bg);
      root.style.setProperty('--kl-theme-surface',t.surface);
      root.style.setProperty('--kl-theme-surface2',t.surface2);
      root.style.setProperty('--kl-theme-text',t.text);
      root.style.setProperty('--kl-theme-muted',t.muted);
      root.style.setProperty('--kl-theme-line',t.line);
      root.style.setProperty('--kl-theme-soft',t.soft);
      root.style.setProperty('--kl-theme-top',t.top);
      root.style.setProperty('--kl-theme-meta',t.meta);
      root.style.setProperty('--kl-theme-accent',t.accent);
      root.style.setProperty('--kl-theme-accent2',t.accent2);
      root.style.setProperty('--kl-theme-hero1',t.hero1);
      root.style.setProperty('--kl-theme-hero2',t.hero2);
      root.style.setProperty('--kl-theme-shadow',t.shadow);
      root.style.setProperty('--kl-theme-background',assets[id] ? 'url("' + assets[id] + '")' : 'none')
      // Bridge page-specific design tokens so standalone pages inherit the same theme too.
      root.style.setProperty('--test-ink',t.text);
      root.style.setProperty('--test-muted',t.muted);
      root.style.setProperty('--test-line',t.line);
      root.style.setProperty('--test-card',t.surface);
      root.style.setProperty('--test-purple',t.accent);
      root.style.setProperty('--test-purple2',t.accent2);
      root.style.setProperty('--test-bg',t.bg);
      root.style.setProperty('--cp-text',t.text);
      root.style.setProperty('--cp-muted',t.muted);
      root.style.setProperty('--cp-card',t.surface);
      root.style.setProperty('--cp-card-strong',t.surface2);
      root.style.setProperty('--cp-purple',t.accent);
      root.style.setProperty('--cp-purple-dark',t.accent);
      root.style.setProperty('--cp-shadow','0 24px 80px ' + t.shadow);
      root.style.setProperty('--text',t.text);
      root.style.setProperty('--purple-dark',t.accent);
      // Bridge legacy CSS variables so all older components consume the active theme palette.
      root.style.setProperty('--kl-accent',t.accent);
      root.style.setProperty('--kl-accent-2',t.accent2);
      root.style.setProperty('--purple',t.accent);
      root.style.setProperty('--purple2',t.accent2);
      root.style.setProperty('--bg',t.bg);
      root.style.setProperty('--ink',t.text);
      root.style.setProperty('--muted',t.muted);
      root.style.setProperty('--line',t.line);
      root.style.setProperty('--shadow','0 12px 30px ' + t.shadow);

      body.dataset.katTheme=id;
      let meta=document.querySelector('meta[name="theme-color"]');
      if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
      meta.setAttribute('content',t.themeColor);
      if(persist)localStorage.setItem('katlearn-theme',id);
      window.dispatchEvent(new CustomEvent('katlearn-theme-changed',{detail:{themeId:id}}));
      return id;
    }
    window.katlearnTheme={apply,themes:Object.freeze(themes)};
    let initial=localStorage.getItem('katlearn-theme')||'default';
    apply(initial,{persist:false});
    async function syncThemeFromProfile(profile){
      const currentUid=String(window.studyStore?.user?.uid||'');
      if(!currentUid){
        localStorage.removeItem('katlearn-theme-uid');
        apply('default',{persist:false});
        return;
      }
      const savedUid=String(localStorage.getItem('katlearn-theme-uid')||'');
      if(savedUid&&savedUid!==currentUid)apply('default',{persist:false});
      const themeId=String(profile?.themeId||'').replace(/^theme-/,'').trim();
      localStorage.setItem('katlearn-theme-uid',currentUid);
      apply(themeId||'default',{persist:true});
    }
    window.addEventListener('8b1-auth-change',async()=>{
      try{
        if(!window.studyStore?.user){await syncThemeFromProfile(null);return}
        let profile=window.katlearnAccount?.profile||null;
        if(!profile&&window.studyStore?.loadProfile)profile=await window.studyStore.loadProfile();
        await syncThemeFromProfile(profile);
      }catch(error){console.warn('[KatLearn theme auth sync]',error)}
    });
    window.addEventListener('katlearn-account-ready',event=>{
      void syncThemeFromProfile(event?.detail?.profile||null);
    });
    window.addEventListener('katlearn-account-profile-updated',event=>{
      if(event?.detail?.user?.uid&&String(event.detail.user.uid)===String(window.studyStore?.user?.uid||'')){
        void syncThemeFromProfile(window.katlearnAccount?.profile||event.detail.profile||null);
      }
    });
  }

(function(){
  function boot(){
    const ready=()=>{ installThemeRuntime();
      if(window.aiPackGeneratorUI?.init) window.aiPackGeneratorUI.init();
      if(window.packPreviewModal?.init) window.packPreviewModal.init();
      installManualAI(); addAiButton(); wirePackSave(); addCuteShopItems();
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
  }
  function addAiButton(){
    if(document.getElementById('openAiPackModal')) return;
    const anchor=document.getElementById('createPersonalPack'); if(!anchor)return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='openAiPackModal'; btn.className=anchor.className; btn.textContent='✨ Tạo pack bằng AI';
    btn.addEventListener('click',()=>window.aiPackGeneratorUI?.open()); anchor.parentNode.insertBefore(btn,anchor.nextSibling);
  }
  function installManualAI(){
    window.aiVocabularyUI={open(){const modal=document.getElementById('wordModal');if(modal)modal.classList.add('show');const input=document.getElementById('newWord');if(input)input.focus()}};
    const word=document.getElementById('newWord'),meaning=document.getElementById('newMeaning'),pron=document.getElementById('newPronounce');
    if(!word||!meaning||!pron||document.getElementById('generateWordAI'))return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='generateWordAI'; btn.className='primary-btn'; btn.style.marginBottom='10px'; btn.textContent='✨ AI tự điền nghĩa & phiên âm'; word.parentNode.insertBefore(btn,meaning);
    let timer=null,requestId=0,lastWord='';
    const fillFromAI=async(value,silent=false)=>{
      const clean=value.trim(); if(!clean||clean.length<2||clean===lastWord)return; lastWord=clean; const id=++requestId;
      if(!silent){btn.disabled=true;btn.textContent='⏳ Kat AI đang tra...'}
      try{const headers={'Content-Type':'application/json'};try{const token=await window.studyStore?.getIdToken?.();if(token)headers.Authorization='Bearer '+token}catch(_){}const res=await fetch('/api/vocab-assist',{method:'POST',headers,body:JSON.stringify({word:clean})});const data=await res.json();if(!res.ok)throw new Error(data.error||'AI chưa sẵn sàng');if(id!==requestId||word.value.trim()!==clean)return;meaning.value=data.meaning||meaning.value;pron.value=data.pronunciation||pron.value;meaning.dispatchEvent(new Event('input',{bubbles:true}));pron.dispatchEvent(new Event('input',{bubbles:true}));if(!silent)toast(`✓ AI đã điền thông tin cho “${clean}”.`)}catch(err){if(!silent)toast(`❌ ${err.message}`)}finally{if(!silent){btn.disabled=false;btn.textContent='✨ AI tự điền nghĩa & phiên âm'}}
    };
    word.addEventListener('input',()=>{clearTimeout(timer);const value=word.value.trim();if(value.length<2){lastWord='';return}timer=setTimeout(()=>fillFromAI(value,true),700)}); btn.addEventListener('click',()=>fillFromAI(word.value,false));
  }
  function wirePackSave(){
    window.addEventListener('pack-ready-to-save',async e=>{
      const pack=e.detail||{};
      const words=(pack.words||[]).map(w=>({word:String(w.word||'').trim(),mean:String(w.meaning_vi||w.mean||'').trim(),pron:String(w.ipa||w.pronunciation||w.pron||'').trim(),emoji:'📚'})).filter(w=>w.word&&w.mean);
      if(!words.length)return toast('Pack AI chưa có từ hợp lệ để lưu.');
      const title=String(pack.pack?.suggested_title||pack.pack?.topic||'AI Vocabulary Pack').trim().slice(0,80)||'AI Vocabulary Pack';
      if(!window.studyStore?.user)return toast('🔒 Hãy đăng nhập để lưu pack AI.');
      try{
        if(window.studyStore?.isClassStudent&&await window.studyStore.isClassStudent()){
          return toast('🔒 Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân.');
        }
        if(window.studyStore.isAdmin?.()){
          await window.studyStore.createPublicPack({name:title,words});
          window.dispatchEvent(new CustomEvent('katlearn-ai-pack-saved',{detail:{name:title,words,public:true}}));
          toast(`✓ Đã lưu “${title}” và xuất bản pack AI.`);
        }else{
          const ref=await window.studyStore.createPersonalPack({name:title,words});
          localStorage.setItem('katlearn-vocab',JSON.stringify(words));
          if(typeof setVocabSource==='function')setVocabSource({kind:'personal',id:ref?.id||''});
          window.dispatchEvent(new CustomEvent('katlearn-ai-pack-saved',{detail:{name:title,words,id:ref?.id||''}}));
          toast(`✓ Đã lưu “${title}” vào Bộ từ của tôi.`);
        }
      }catch(err){
        toast(`❌ Không thể lưu pack AI: ${err.message||err}`);
        return;
      }
      setTimeout(()=>location.reload(),450);
    });
  }
  function addCuteShopItems(){
    const shop=document.getElementById('shop'); if(!shop||shop.dataset.katlearnShopReady==='1')return; shop.dataset.katlearnShopReady='1';
    let grid=shop.querySelector('.katlearn-cute-shop-grid');
    if(!grid){
      grid=document.createElement('div');
      grid.className='shop-grid katlearn-cute-shop-grid';
      const label=document.createElement('div');
      label.className='shop-cute-dynamic-label';
      label.innerHTML="<p class=\"eyebrow\">KAT'S CUTIE DROP</p><h2>🐱 Đồ cute của Kat</h2><p>Một chút đáng yêu cho góc học tập.</p>";
      shop.append(label,grid);
    }
    const items=[
      ['cat-nap','Cat Nap','Một góc ngủ mềm mềm cho Kat.','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=82'],
      ['tabby-cozy','Cozy Tabby','Một chiếc mood chill đúng nghĩa.','https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=82'],
      ['sleepy-cat','Sleepy Kitty','Nhìn thôi cũng muốn đi ngủ.','https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82'],
      ['window-cat','Window Chill','Mèo + ánh sáng = bình yên.','https://images.unsplash.com/photo-1489084917528-a57e68a79a1e?auto=format&fit=crop&w=900&q=82'],
      ['soft-cat','Soft Paws','Một chút cute cho bộ sưu tập.','https://images.unsplash.com/photo-1548546738-8509cb246ed3?auto=format&fit=crop&w=900&q=82'],
      ['pastel-cat','Pastel Kitty','Một chiếc ảnh pastel siêu chill.','https://images.unsplash.com/photo-1595752776689-aebef37b5d32?auto=format&fit=crop&w=900&q=82']
    ];
    let ownedItems=new Set();
    try{const raw=JSON.parse(localStorage.getItem('katlearn-owned-shop-items')||'[]');if(Array.isArray(raw))ownedItems=new Set(raw.filter(Boolean).map(String))}catch(_){localStorage.removeItem('katlearn-owned-shop-items')}
    const existing=new Set([...grid.querySelectorAll('[data-katlearn-item]')].map(x=>x.dataset.katlearnItem));
    items.forEach(([id,name,desc,img])=>{if(existing.has(id))return;const card=document.createElement('article');card.className='shop-item';card.dataset.katlearnItem=id;card.innerHTML=`<img src="${img}" alt="${name}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:18px 18px 0 0;display:block"><div style="padding:16px"><span style="font-size:.78rem;font-weight:800;letter-spacing:.06em">KAT'S CUTIE DROP</span><h3 style="margin:.35rem 0">${name}</h3><p style="margin:.35rem 0 1rem">${desc}</p><button type="button" data-price="3000" style="width:100%" ${ownedItems.has(id)?'disabled':''}>${ownedItems.has(id)?'✓ Đã mua':'🪙 3,000 xu'}</button></div>`;grid.appendChild(card);const buy=card.querySelector('button');buy.addEventListener('click',async()=>{if(!window.studyStore?.user)return toast('Đăng nhập để mua vật phẩm và lưu vào tài khoản nhé 🐱');const balance=Number((document.getElementById('coinCount')?.textContent||'0').replace(/,/g,''));if(balance<3000)return toast('Bạn chưa đủ 3,000 xu cho vật phẩm này.');try{
        const token=await window.studyStore.getIdToken();
        if(!token)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        const res=await fetch('/api/game-action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'purchase',itemId:'shop-'+id})});
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'Không thể hoàn tất giao dịch');
        const nextCoins=Number(data.coins);
        if(!Number.isFinite(nextCoins))throw new Error('Server không trả về số dư mới.');
        if(typeof coins!=='undefined')coins=nextCoins;
        document.getElementById('coinCount')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        document.getElementById('shopCoins')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        document.getElementById('panelCoins')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        buy.textContent='✓ Đã mua';buy.disabled=true;ownedItems.add(id);localStorage.setItem('katlearn-owned-shop-items',JSON.stringify([...ownedItems]));toast(`✓ Đã mua “${name}” với 3,000 xu!`);
      }catch(err){toast(`❌ Không thể mua vật phẩm: ${err.message}`)}})});
  }
  function toast(msg){if(typeof window.toast==='function')return window.toast(msg);const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
  boot();
})();
