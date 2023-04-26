$(document).ready(async () => {
    async function getUser() {
        const response = await fetch('/.auth/me');
        const payload = await response.json();
        const { clientPrincipal } = payload;
        return clientPrincipal;
    }

    try {
        const user = await getUser();
        console.log(user);
        $("#logout").html("Logout (" + user.userDetails + ")");
        $(".member").show();
        $(".nonmember").hide();
    }
    catch (ex) {
        $(".member").hide();
        $(".nonmember").show();
    }

    $("#classIdSubmit").on("click", async (evt) => {
        evt.preventDefault();
        const classId = $("#classId").val();
        const response = await fetch(`/api/enable-screen-sharing?classId=${classId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();
        console.log(data);
    });

    const screens = $("#screens");
    let refreshImageInterval = null;
    async function refreshImage() {
        const classId = $("#classId").val();
        const response = await fetch(`/api/get-class-screens?classId=${classId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();
        console.log(data);

        screens.empty();
        data.forEach(screen => {
            const { email, sasUrl, name } = screen;
            const img = $(`
            <div class="col-sm-6 col-md-4 mb-3">
                <h6>${name}</h6>
                <a href="${sasUrl}" target="_blank" rel="noopener noreferrer" class="studentScreen"><img src="${sasUrl}" alt="${name} ${email}" class="fluid img-thumbnail"/><a/>                
            </div>`);
            screens.append(img);
        });
    }

    let started = false;
    const autoRefresh = $("#auto-refresh");
    autoRefresh.on("click", async (evt) => {
        evt.preventDefault();

        if (started) {
            clearInterval(refreshImageInterval);
            autoRefresh.html("Start Auto Refresh");
            started = false;
        }
        else {
            refreshImageInterval = setInterval(refreshImage, 5000);
            refreshImage();
            autoRefresh.html("Stop Auto Refresh");
            started = true;
        }
    });

    $('body').on('click', 'a.studentScreen', (evt)=> {
        evt.preventDefault();
        const student = $(evt.target).attr("alt");
        const sasUrl = $(evt.target).attr("src");
        $("#modal-title").html(student);
        $('#modal-body').html(`<img src="${sasUrl}" alt="${sasUrl}" class="fluid img-thumbnail"/>`);
        $('#screenModal').modal('show');
    });
});