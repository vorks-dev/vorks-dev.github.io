import { replaceIcons } from "/icons.js"

window.onload = () => {
    init();
}

function init() {
    replaceIcons();
    fillAppCloud();
}

const apps = [
    {
        "name": "Gradia",
        "icon": "https://vorks-dev.github.io/gradia/img/app_icon.png",
        "url": "https://vorks-dev.github.io/apps/gradia/"
    },
    {
        "name": "Lysa",
        "icon": "https://vorks-dev.github.io/lysa/img/app_icon.png",
        "url": "https://vorks-dev.github.io/apps/lysa/"
    },
    {
        "name": "DataManager.js",
        "icon": "https://datamanager.js.org/logo.svg",
        "url": "https://vorks-dev.github.io/apps/datamanager.js"
    }
]

//----- App Cloud -----//
async function fillAppCloud() {
    const appClouds = document.getElementsByClassName("appCloud");
    const appDiv = document.createElement("div");
    apps.forEach((app, i) => {
        const anchor = document.createElement("a");
        anchor.href = app.url;
        anchor.target = "_blank";
        anchor.ariaLabel = `More information on ${app.name}`;

        const img = document.createElement("img");
        img.src = app.icon;
        img.title = app.name;

        anchor.appendChild(img);
        appDiv.appendChild(anchor);
    });

    for(const appCloud of appClouds) {
        appCloud.appendChild(appDiv);
    }
}