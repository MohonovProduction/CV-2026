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

function init() {
    toggle()
    workFullscreen = initWorkFullscreen()
    initWorkVideoControls()
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

function toggle() {
    const toggleGroup = document.querySelector('.toggle_group');

    for (let i = 0; i < toggleGroup.children.length; i++) {
        const child = toggleGroup.children[i];
        console.log(child)
        child.addEventListener('click', (e) => {
            console.log(e);

            const toggleGroup = document.querySelector('.toggle_group');
            const toggleListWrapper = document.querySelector('.toggle_list_wrapper');
            console.log(toggleListWrapper, toggleGroup)

            for (let j = 0; j < toggleGroup.children.length; j++) {
                toggleGroup.children[j].classList.remove('toggle_group__heading--active');
                toggleListWrapper.children[j].classList.remove('toggle_list--active');
            }

            e.target.classList.add('toggle_group__heading--active');
            toggleListWrapper.children[i].classList.add('toggle_list--active');
        })
    }
}
