let students;
let currentChatRecord;
let mark;
let teacherEmail;
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
        teacherEmail = user.userDetails;
        $("#logout").html("Logout (" + user.userDetails + ")");
        $(".member").show();
        $(".nonmember").hide();
    }
    catch (ex) {
        $(".member").hide();
        $(".nonmember").show();
    }

    function getUrlVars() {
        let vars = [], hash;
        let hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (let i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    }
    const parameters = getUrlVars();
    const inputFields = ["email", "taskId", "start", "end"];
    for (let field of inputFields) {
        if (parameters[field]) {
            $(`#${field}`).val(parameters[field]);
        }
    }

    const noChatrecord = $("#no-chat-record");
    const tableBody = $("#table-body");
    async function loadStudentChatRecords() {
        const start = new Date($("#start").val());
        const end = new Date($("#end").val());
        const email = $("#email").val();
        const taskId = $("#taskId").val();
        const response = await fetch(`/api/chat-records?email=${email}&taskId=${taskId}&start=${start.toISOString()}&end=${end.toISOString()}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();
        console.log(data);
        currentChatRecord = data;

        if (data.length === 0) {
            noChatrecord.show();
        } else {
            noChatrecord.hide();
        }

        let rowCount = 1;
        tableBody.empty();
        data.forEach(chat => {
            const { User, Chatbot, taskId, Model, CompletionTokens, PromptTokens, TotalTokens, Cost, timestamp } = chat;
            let other = { ...chat };
            const fieldsToDelete = ["User", "Chatbot", "taskId", "Model", "CompletionTokens", "PromptTokens", "TotalTokens", "Cost", "timestamp"];
            for (let field of fieldsToDelete) {
                delete other[field];
            }

            const newDate = new Date(timestamp);
            const tr = $(`
                <tr>
                    <th scope="row">${rowCount}</th>
                    <td>${User}</td>
                    <td>${Chatbot}</td>
                    <td>${taskId}</td>
                    <td>${Model}</td>
                    <td>${PromptTokens}</td>
                    <td>${CompletionTokens}</td>
                    <td>${TotalTokens}</td>
                    <td class=".wrap">USD$ ${Cost}</td>
                    <td>${newDate.toDateString()} ${newDate.toTimeString()}</td>
                    <td class=".wrap">${JSON.stringify(other, null, 2)}</td>
                </tr>
                `);
            tableBody.append(tr);
            rowCount++;
        });
        return data;
    }


    async function gradeCurrentStudent() {
        const template = $("#PromptTextarea").val();
        const costAndTokens = currentChatRecord.reduce((acc, chat) => {
            acc.totalCost += chat.Cost;
            acc.totalTokens += chat.TotalTokens;
            acc.completionTokens += chat.CompletionTokens;
            acc.promptTokens += chat.PromptTokens;
            return acc;
        }, { totalCost: 0, totalTokens: 0, completionTokens: 0, promptTokens: 0 });
        const result = Mustache.render(template, { "conversations": currentChatRecord, ...costAndTokens });
        $("#ResponseTextarea").html(result);

        const systemMessage = { "role": "system", "content": "You are a helpful assistant." };
        const messages = [systemMessage,
            { "role": "user", "content": result }
        ];
        const m = {
            "model": $("#model").val(),
            "prompt": messages,
            "max_tokens": 800,
            "temperature": 0.7,
            "top_p": 0.95,
            "frequency_penalty": 0,
            "presence_penalty": 0,
            "stop": ["<|im_end|>"]
        };

        const response = await fetch(`/api/chatgpt/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(m)
        });
        const json = await response.json();
        mark = json;
        console.log(json);
        const answer = json.choices[0].message.content;
        $("#ResponseTextarea").html(answer);

        const marked = JSON.parse(answer);
        if (marked.comments) {
            $("#mark").val(marked.marks);
            $("#ResponseTextarea").val(marked.comments);
            return marked;
        } else {
            $("#ResponseTextarea").html(answer);
        }
    }

    async function saveMark(assignmentId) {
        const studentEmail = $("#email").val();
        const start = new Date($("#start").val());
        const end = new Date($("#end").val());
        const taskId = $("#taskId").val();
        const mark = $("#mark").val();
        const comments = $("#ResponseTextarea").val();
        const response = await fetch(`/api/save-mark`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ studentEmail, assignmentId, taskId, start, end, mark, comments })
        });
        const data = await response.json();
        console.log(data);
    }


    $("#email-submit").on("click", async (evt) => {
        evt.preventDefault();
        await loadStudentChatRecords();
    });

    $("#comment-submit").on("click", async (evt) => {
        evt.preventDefault();
        await gradeCurrentStudent();
    });

    $("#studentClass").on("change", async (evt) => {
        const classId = $("#studentClass").val();
        const response = await fetch(`/api/get-class-emails?classId=${classId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();
        const studentSelect = $("#email");
        studentSelect.empty();
        students = data;
        data.forEach(student => {
            const { email, name } = student;
            const option = $(`<option value="${email}">${email} ${name}</option>`);
            studentSelect.append(option);
        });
    });

    $("#saveMark").on("click", async (evt) => {
        evt.preventDefault();
        const assignmentId = $("#assignmentId").val();
        if (!assignmentId) {
            alert("Please give an assignment ID");
            return;
        }
        await saveMark(assignmentId);
    });

    $("#grade-class-submit").on("click", async (evt) => {
        evt.preventDefault();
        const assignmentId = $("#assignmentId").val();
        if (!assignmentId) {
            alert("Please give an assignment ID");
            return;
        }
        const response = confirm("Are you sure grade the whole class?");
        if (!response) return;

        for (let student of students) {
            console.log(student);
            $("#email").val(student.email);
            const chat = await loadStudentChatRecords();
            if (chat.length > 0) {
                await gradeCurrentStudent();
                await saveMark(assignmentId);
            }
        }
    });

    $("#mark-report-submit").on("click", async (evt) => {
        evt.preventDefault();
        const assignmentId = $("#assignmentId").val();
        const taskId = $("#taskId").val();
        $.ajax({
            url: '/api/assignment-report',
            method: 'POST',
            xhrFields: {
                responseType: 'blob'
            },
            data: JSON.stringify({ assignmentId, taskId }),
            success: (data) => {
                const fileName = "markreport-" + assignmentId + "-" + taskId + ".xlsx"
                var a = document.createElement('a');
                var url = window.URL.createObjectURL(data);
                a.href = url;
                a.download = fileName;
                document.body.append(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        });
    });
});



