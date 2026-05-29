document.addEventListener('DOMContentLoaded', () => {
    init();
});

const WORK_FULLSCREEN_TRANSITION_MS = 400;
const SUPPORTS_SCROLLBAR_GUTTER = CSS.supports('scrollbar-gutter', 'stable');

/** @type {{ open: (media: Element) => void, close: () => void } | null} */
let workFullscreen = null;

function lockPageScroll() {
    if (!SUPPORTS_SCROLLBAR_GUTTER) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
    }
    document.documentElement.classList.add('work-fullscreen-open');
    document.body.classList.add('work-fullscreen-open');
}

function unlockPageScroll() {
    document.documentElement.classList.remove('work-fullscreen-open');
    document.body.classList.remove('work-fullscreen-open');
    document.body.style.paddingRight = '';
}

const SECTION_NAV_SCROLL_OFFSET = 20;
const PARALLAX_RATE = 0.17;

function init() {
    initExperienceToggle()
    initToggleGroupPill()
    workFullscreen = initWorkFullscreen()
    initWorkVideoControls()
    initSectionNav()
    initBackgroundParallax()
}

function initBackgroundParallax() {
    const backgrounds = [...document.querySelectorAll('.background')];
    if (!backgrounds.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        backgrounds.forEach((background) => {
            background.style.transform = '';
        });
        return;
    }

    const items = backgrounds
        .map((background) => {
            const section = background.closest('.header, .article');
            if (!section) return null;

            background.classList.add('background--parallax');
            return { background, section };
        })
        .filter(Boolean);

    if (!items.length) return;

    let parallaxRaf = null;

    const updateParallax = () => {
        parallaxRaf = null;
        const scrollY = window.scrollY;

        items.forEach(({ background, section }) => {
            const scrolled = scrollY - section.offsetTop;
            const offset = scrolled * PARALLAX_RATE;
            background.style.transform = `translate3d(0, ${offset}px, 0)`;
        });
    };

    const scheduleParallaxUpdate = () => {
        if (parallaxRaf !== null) return;
        parallaxRaf = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', scheduleParallaxUpdate, { passive: true });
    window.addEventListener('resize', scheduleParallaxUpdate, { passive: true });
}

function formatVideoTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function initWorkFullscreen() {
    const overlay = document.getElementById('workFullscreen');
    const stage = overlay?.querySelector('.work_fullscreen__stage');
    if (!overlay || !stage) return null;

    let activeMedia = null;
    let mediaPlaceholder = null;
    let closeTimer = null;

    const setFullscreenButton = (media, isOpen) => {
        const btn = media?.querySelector('.work__controls_fullscreen');
        if (!btn) return;
        btn.classList.toggle('is-fullscreen', isOpen);
        btn.setAttribute(
            'aria-label',
            isOpen ? 'Свернуть с полного экрана' : 'Развернуть на весь экран'
        );
    };

    const createMediaPlaceholder = (media) => {
        const placeholder = document.createElement('div');
        placeholder.className = 'work__media-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.style.minHeight = `${media.offsetHeight}px`;
        return placeholder;
    };

    const restoreMedia = () => {
        const media = stage.querySelector('.work__media');
        media?.classList.remove('work__media--fullscreen');
        const article = mediaPlaceholder?.parentElement;
        if (media && article && mediaPlaceholder) {
            article.replaceChild(media, mediaPlaceholder);
        }
        if (activeMedia) setFullscreenButton(activeMedia, false);
        activeMedia = null;
        mediaPlaceholder = null;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
    };

    const close = () => {
        if (!activeMedia) return;
        overlay.classList.remove('is-open');
        unlockPageScroll();
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(restoreMedia, WORK_FULLSCREEN_TRANSITION_MS);
    };

    const open = (media) => {
        const article = media.parentElement;
        if (!article) return;

        if (activeMedia === media) {
            close();
            return;
        }

        if (activeMedia) {
            window.clearTimeout(closeTimer);
            restoreMedia();
            overlay.classList.remove('is-open');
        }

        mediaPlaceholder = createMediaPlaceholder(media);
        article.replaceChild(mediaPlaceholder, media);
        stage.appendChild(media);
        media.classList.add('work__media--fullscreen');

        activeMedia = media;
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        setFullscreenButton(media, true);
        lockPageScroll();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('is-open'));
        });
    };

    overlay.querySelector('[data-fullscreen-close]')?.addEventListener('click', close);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && activeMedia) close();
    });

    return { open, close };
}

function initWorkVideoControls() {
    document.querySelectorAll('.work__media').forEach((media) => {
        const video = media.querySelector('.work__video');
        const playBtn = media.querySelector('.work__controls_play');
        const muteBtn = media.querySelector('.work__controls_mute');
        const fullscreenBtn = media.querySelector('.work__controls_fullscreen');
        const progress = media.querySelector('.work__controls_progress');
        if (!video || !playBtn || !muteBtn || !fullscreenBtn || !progress) return;

        const updateProgressLabel = () => {
            const current = formatVideoTime(video.currentTime);
            const total = formatVideoTime(video.duration);
            progress.setAttribute('aria-valuetext', `${current} из ${total}`);
        };

        const setProgressPercent = (percent) => {
            progress.style.setProperty('--work-progress', `${percent}%`);
            progress.value = String(percent);
        };

        const updateProgress = () => {
            if (!video.duration) return;
            const percent = (video.currentTime / video.duration) * 100;
            setProgressPercent(percent);
            updateProgressLabel();
        };

        const setPlaying = (isPlaying) => {
            playBtn.classList.toggle('is-playing', isPlaying);
            playBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
        };

        const setMuted = (isMuted) => {
            muteBtn.classList.toggle('is-muted', isMuted);
            muteBtn.setAttribute('aria-label', isMuted ? 'Включить звук' : 'Выключить звук');
        };

        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });

        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            setMuted(video.muted);
        });

        fullscreenBtn.addEventListener('click', () => {
            workFullscreen?.open(media);
        });

        progress.addEventListener('pointerdown', () => progress.classList.add('is-seeking'));
        progress.addEventListener('pointerup', () => progress.classList.remove('is-seeking'));
        progress.addEventListener('pointercancel', () => progress.classList.remove('is-seeking'));

        progress.addEventListener('input', () => {
            if (!video.duration) return;
            const percent = Number(progress.value);
            video.currentTime = (percent / 100) * video.duration;
            progress.style.setProperty('--work-progress', `${percent}%`);
            updateProgressLabel();
        });

        video.addEventListener('loadedmetadata', updateProgress);
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('play', () => setPlaying(true));
        video.addEventListener('pause', () => setPlaying(false));
        video.addEventListener('ended', () => {
            video.currentTime = 0;
            setPlaying(false);
            updateProgress();
        });

        setPlaying(false);
        setMuted(video.muted);
        setProgressPercent(0);
        updateProgressLabel();
    });
}

function slugifySectionId(text, usedIds) {
    const base = text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section';

    let id = base;
    let suffix = 2;

    while (usedIds.has(id) || document.getElementById(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }

    usedIds.add(id);
    return id;
}

function initSectionNav() {
    const main = document.querySelector('.page_main');
    if (!main) return;

    const headings = [...main.querySelectorAll('h2')];
    if (!headings.length) return;

    const usedIds = new Set();
    const sections = headings.map((heading) => {
        if (!heading.id) {
            heading.id = slugifySectionId(heading.textContent, usedIds);
        } else {
            usedIds.add(heading.id);
        }
        return heading;
    });

    const nav = document.createElement('nav');
    nav.className = 'section-nav';
    nav.setAttribute('aria-label', 'Навигация по разделам');

    const list = document.createElement('ol');
    list.className = 'section-nav__list';

    const items = sections.map((heading, index) => {
        const item = document.createElement('li');
        item.className = 'section-nav__item';
        if (index === 0) item.classList.add('is-active');

        const link = document.createElement('a');
        link.className = 'section-nav__link';
        link.href = `#${heading.id}`;
        link.setAttribute('aria-current', index === 0 ? 'true' : 'false');

        const dot = document.createElement('span');
        dot.className = 'section-nav__dot';
        dot.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'section-nav__label';
        label.textContent = heading.textContent.trim();

        link.setAttribute('aria-label', heading.textContent.trim());

        link.append(dot, label);
        item.appendChild(link);
        list.appendChild(item);

        link.addEventListener('click', (event) => {
            event.preventDefault();
            scrollToSection(heading);
        });

        return { item, link, heading };
    });

    nav.appendChild(list);
    document.body.appendChild(nav);

    let scrollRaf = null;
    let activeIndex = 0;

    const setActiveIndex = (index) => {
        if (index === activeIndex || index < 0 || index >= items.length) return;
        activeIndex = index;

        items.forEach(({ item, link }, i) => {
            const isActive = i === index;
            item.classList.toggle('is-active', isActive);
            link.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    };

    const updateActiveFromScroll = () => {
        scrollRaf = null;
        const marker = window.scrollY + SECTION_NAV_SCROLL_OFFSET + 1;
        let nextIndex = 0;

        sections.forEach((heading, index) => {
            const top = heading.getBoundingClientRect().top + window.scrollY;
            if (top <= marker) nextIndex = index;
        });

        setActiveIndex(nextIndex);
    };

    const scheduleActiveUpdate = () => {
        if (scrollRaf !== null) return;
        scrollRaf = window.requestAnimationFrame(updateActiveFromScroll);
    };

    const scrollToSection = (heading) => {
        const top = heading.getBoundingClientRect().top + window.scrollY - SECTION_NAV_SCROLL_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    updateActiveFromScroll();
    window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveUpdate, { passive: true });
}

function setActiveToggleIndex(index) {
    const toggleListWrapper = document.querySelector('.toggle_list_wrapper');
    if (!toggleListWrapper) return;

    const tabCount = toggleListWrapper.children.length;
    if (index < 0 || index >= tabCount) return;

    document.querySelectorAll('.toggle_group').forEach((group) => {
        [...group.children].forEach((heading, i) => {
            heading.classList.toggle('toggle_group__heading--active', i === index);
        });
    });

    [...toggleListWrapper.children].forEach((list, i) => {
        list.classList.toggle('toggle_list--active', i === index);
    });
}

function initExperienceToggle() {
    const toggleListWrapper = document.querySelector('.toggle_list_wrapper');
    if (!toggleListWrapper) return;

    document.addEventListener('click', (event) => {
        const heading = event.target.closest('.toggle_group__heading');
        if (!heading) return;

        const group = heading.closest('.toggle_group');
        if (!group) return;

        const index = [...group.children].indexOf(heading);
        if (index === -1) return;

        setActiveToggleIndex(index);
    });
}

function initToggleGroupPill() {
    const experienceWrapper = document.querySelector('.experience_wrapper');
    const sourceToggleGroup = experienceWrapper?.querySelector('.toggle_group');
    if (!experienceWrapper || !sourceToggleGroup) return;

    const pill = document.createElement('div');
    pill.className = 'toggle_group_pill';
    pill.setAttribute('aria-hidden', 'true');

    const pillToggleGroup = sourceToggleGroup.cloneNode(true);
    pillToggleGroup.classList.add('toggle_group--pill');
    pill.appendChild(pillToggleGroup);
    document.body.appendChild(pill);

    let experienceInView = false;
    let toggleInView = true;
    let visibilityRaf = null;

    const updatePillVisibility = () => {
        visibilityRaf = null;
        const shouldShow = experienceInView && !toggleInView;
        pill.classList.toggle('is-visible', shouldShow);
        pill.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        document.body.classList.toggle('is-toggle-pill-visible', shouldShow);
    };

    const scheduleVisibilityUpdate = () => {
        if (visibilityRaf !== null) return;
        visibilityRaf = window.requestAnimationFrame(updatePillVisibility);
    };

    const observerOptions = { threshold: 0, rootMargin: '-8px 0px 0px 0px' };

    const experienceObserver = new IntersectionObserver(([entry]) => {
        experienceInView = entry.isIntersecting;
        scheduleVisibilityUpdate();
    }, observerOptions);

    const toggleObserver = new IntersectionObserver(([entry]) => {
        toggleInView = entry.isIntersecting;
        scheduleVisibilityUpdate();
    }, observerOptions);

    experienceObserver.observe(experienceWrapper);
    toggleObserver.observe(sourceToggleGroup);
    updatePillVisibility();
}
