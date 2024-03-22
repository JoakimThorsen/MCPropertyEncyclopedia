
if(!localStorage.getItem('theme')) {
    localStorage.setItem('theme', window?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));

if(localStorage.getItem('theme') === 'dark') {
    $('#dark-mode-toggle').children().toggleClass('display-none');
}

function toggleTheme() {
    let theme;
    switch (localStorage.getItem('theme')) {
        case 'dark':
            theme = 'light';
            break
        case 'light':
            theme = 'dark';
        default:
            theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    $('#dark-mode-toggle').children().toggleClass('display-none');
}
