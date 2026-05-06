document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    toggle()
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
