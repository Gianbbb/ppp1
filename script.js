document.addEventListener('DOMContentLoaded', () => {
    // ---------- ELEMENTI DEL DOM ----------
    const allViews = ['calendar-container', 'workout-section', 'progress-section'];
    const mediaViewer = document.getElementById('media-viewer');
    const mediaContent = document.getElementById('media-content');
    const globalTimerElement = document.getElementById('global-timer');
    const workoutDateElement = document.getElementById('workout-date');
    const workoutTypeSelect = document.getElementById('workout-type-select');
    const exerciseList = document.getElementById('exercise-list');
    const progressSelect = document.getElementById('exercise-progress-select');
    const progressChartCanvas = document.getElementById('progress-chart').getContext('2d');

    let currentDate = new Date();
    let selectedDate = null;
    let chart = null;
    let globalTimerInterval = null;
    let restTimerInterval = null;
    let currentMedia = [];
    let currentMediaIndex = 0;

    // ---------- GESTIONE VISTE E TIMER GLOBALE ----------
    const showView = (viewId) => {
        allViews.forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        if (viewId === 'workout-section') startGlobalTimer();
        else stopGlobalTimer();
    };
    const startGlobalTimer = () => {
        stopGlobalTimer();
        globalTimerElement.classList.remove('hidden');
        let seconds = 0;
        globalTimerInterval = setInterval(() => {
            seconds++;
            const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            globalTimerElement.textContent = `${mins}:${secs}`;
        }, 1000);
    };
    const stopGlobalTimer = () => {
        clearInterval(globalTimerInterval);
        globalTimerElement.classList.add('hidden');
    };

    // ---------- GESTIONE DATI ----------
    const getSavedData = () => JSON.parse(localStorage.getItem('gymTrackerData')) || {};
    const saveData = (data) => localStorage.setItem('gymTrackerData', JSON.stringify(data));

    // ---------- GESTIONE VISUALIZZATORE MEDIA ----------
    const showMedia = (index) => {
        currentMediaIndex = index;
        const media = currentMedia[index];
        mediaContent.innerHTML = '';
        if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.src; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            mediaContent.appendChild(video);
        } else if (media.type === 'image') {
            const img = document.createElement('img'); img.src = media.src;
            mediaContent.appendChild(img);
        }
    };
    const openMediaViewer = (exerciseName) => {
        const plan = workoutPlans[workoutTypeSelect.value];
        if (!plan) return;
        const exercise = plan.find(ex => ex.name === exerciseName);
        if (exercise && exercise.media && exercise.media.length > 0) {
            currentMedia = exercise.media; showMedia(0);
            mediaViewer.classList.remove('hidden');
        }
    };
    const closeMediaViewer = () => { mediaViewer.classList.add('hidden'); mediaContent.innerHTML = ''; };

    // ---------- LOGICA CALENDARIO ----------
    const renderCalendar = () => {
        const month = currentDate.getMonth(), year = currentDate.getFullYear();
        document.getElementById('month-year').textContent = `${currentDate.toLocaleString('it-IT', { month: 'long' })} ${year}`;
        const calendarElement = document.getElementById('calendar'); calendarElement.innerHTML = '';
        const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        weekDays.forEach(day => { const el = document.createElement('div'); el.textContent = day; el.className = 'weekday'; calendarElement.appendChild(el); });
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) calendarElement.appendChild(document.createElement('div'));
        const savedData = getSavedData();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div'); dayEl.textContent = i; dayEl.className = 'day';
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dayEl.dataset.date = dateStr; if (savedData[dateStr]) dayEl.classList.add(savedData[dateStr].type);
            dayEl.addEventListener('click', () => openWorkoutForDate(dateStr)); calendarElement.appendChild(dayEl);
        }
    };

    // ---------- LOGICA ALLENAMENTO ----------
    const openWorkoutForDate = (dateStr) => {
        selectedDate = dateStr;
        workoutDateElement.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        exerciseList.innerHTML = ''; workoutTypeSelect.value = '';
        const savedData = getSavedData();
        if (savedData[selectedDate]) {
            workoutTypeSelect.value = savedData[selectedDate].type;
            loadExercises(savedData[selectedDate].type, savedData[selectedDate].exercises);
        }
        showView('workout-section');
    };
    const loadExercises = (type, savedExercises = []) => {
        const plan = workoutPlans[type]; exerciseList.innerHTML = ''; if (!plan) return;
        plan.forEach((exercise) => {
            const exerciseData = savedExercises.find(e => e.name === exercise.name) || {};
            const exerciseDiv = document.createElement('div'); exerciseDiv.className = 'exercise'; exerciseDiv.dataset.name = exercise.name; if (exerciseData.completed) exerciseDiv.classList.add('completed');
            const mediaIcon = (exercise.media && exercise.media.length > 0) ? `<div class="media-icon" data-exercise-name="${exercise.name}" title="Guarda media"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"></path></svg></div>` : '';
            exerciseDiv.innerHTML = `<div class="exercise-header"><span>${exercise.name} (${exercise.sets}x${exercise.reps})</span>${mediaIcon}</div><div class="sets-container"></div><textarea class="notes" placeholder="Note veloci...">${exerciseData.notes || ''}</textarea><button class="finish-exercise-btn" ${exerciseData.completed ? 'disabled' : ''}>✅ Fine Esercizio</button>`;
            const allData = getSavedData(); const lastWorkoutData = findLastExerciseData(allData, exercise.name);
            const setsContainer = exerciseDiv.querySelector('.sets-container');
            for (let i = 0; i < exercise.sets; i++) {
                const setData = exerciseData.series ? (exerciseData.series[i] || {}) : {}; const lastSetData = lastWorkoutData.series ? (lastWorkoutData.series[i] || {}) : {};
                const setDiv = document.createElement('div'); setDiv.className = 'set';
                setDiv.innerHTML = `<span>Serie ${i + 1}</span><input type="number" class="weight" placeholder="kg" value="${setData.weight || ''}"><input type="number" class="reps-done" placeholder="reps" value="${setData.reps || ''}"><input type="number" class="rir" placeholder="RIR" value="${setData.rir || ''}"><small class="last-time">Last: ${lastSetData.weight || '–'}kg x ${lastSetData.reps || '–'} @RIR ${lastSetData.rir || '–'}</small><div class="timer-buttons"><button data-duration="30">30s</button> <button data-duration="60">60s</button> <button data-duration="90">90s</button></div>`;
                setsContainer.appendChild(setDiv);
            }
            exerciseList.appendChild(exerciseDiv);
        });
    };
    const findLastExerciseData = (allData, exerciseName) => {
        const dates = Object.keys(allData).sort((a, b) => new Date(b) - new Date(a));
        for (const date of dates) { if (selectedDate && date >= selectedDate) continue; const workout = allData[date]; const exercise = workout.exercises.find(e => e.name === exerciseName); if (exercise) return exercise; } return {};
    };

    // ---------- LOGICA DI SALVATAGGIO ----------
    const saveSingleExercise = (exerciseDiv) => {
        const exerciseName = exerciseDiv.dataset.name; if (!exerciseName || !selectedDate) return;
        const startTime = parseInt(exerciseDiv.dataset.startTime, 10);
        const durationSeconds = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        const series = [];
        exerciseDiv.querySelectorAll('.set').forEach(setDiv => {
            const weight = setDiv.querySelector('.weight').value, reps = setDiv.querySelector('.reps-done').value, rir = setDiv.querySelector('.rir').value;
            if (weight && reps) series.push({ weight: parseFloat(weight), reps: parseInt(reps), rir: parseInt(rir) });
        });
        const notes = exerciseDiv.querySelector('.notes').value;
        const allData = getSavedData(); if (!allData[selectedDate]) allData[selectedDate] = { type: workoutTypeSelect.value, exercises: [] };
        let exerciseData = allData[selectedDate].exercises.find(e => e.name === exerciseName);
        if (exerciseData) { exerciseData.series = series; exerciseData.notes = notes; exerciseData.completed = true; exerciseData.duration = durationSeconds; } 
        else { allData[selectedDate].exercises.push({ name: exerciseName, series, notes, completed: true, duration: durationSeconds }); }
        saveData(allData); exerciseDiv.classList.add('completed'); exerciseDiv.querySelector('.finish-exercise-btn').disabled = true;
    };

    // ---------- LOGICA TIMER DI RECUPERO ----------
    const startTimer = (duration, element) => {
        clearInterval(restTimerInterval); const currentSetDiv = element.closest('.set');
        let timer = duration; element.disabled = true;
        restTimerInterval = setInterval(() => {
            element.textContent = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;
            if (--timer < 0) {
                clearInterval(restTimerInterval); element.disabled = false; element.textContent = `${duration}s`; if (navigator.vibrate) navigator.vibrate(200);
                const nextSetDiv = currentSetDiv.nextElementSibling;
                if (nextSetDiv && nextSetDiv.classList.contains('set')) {
                    document.querySelectorAll('.set.focused').forEach(el => el.classList.remove('focused')); nextSetDiv.classList.add('focused');
                    const nextWeightInput = nextSetDiv.querySelector('.weight'); nextWeightInput.focus(); nextWeightInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 1000);
    };

    // ---------- LOGICA GRAFICI ----------
    const updateProgressSection = () => {
        const allData = getSavedData(), exerciseNames = [...new Set(Object.values(allData).flatMap(w => w.exercises.map(e => e.name)))];
        progressSelect.innerHTML = '<option value="">Seleziona Esercizio</option>';
        exerciseNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; progressSelect.appendChild(option); });
    };
    progressSelect.addEventListener('change', () => {
        const exerciseName = progressSelect.value; if (chart) chart.destroy(); if (!exerciseName) return;
        const allData = getSavedData(), labels = [], maxWeightData = [], totalVolumeData = [];
        Object.keys(allData).sort((a,b) => new Date(a) - new Date(b)).forEach(date => {
            const workout = allData[date], exercise = workout.exercises.find(e => e.name === exerciseName);
            if (exercise && exercise.series.length > 0) {
                labels.push(new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {day: '2-digit', month: 'short'}));
                let maxWeight = 0, volume = 0;
                exercise.series.forEach(set => { if (set.weight > maxWeight) maxWeight = set.weight; volume += set.weight * set.reps; });
                maxWeightData.push(maxWeight); totalVolumeData.push(volume);
            }
        });
        chart = new Chart(progressChartCanvas, {
            type: 'line', data: { labels, datasets: [{ label: 'Carico Max (kg)', data: maxWeightData, borderColor: '#ff8a80', backgroundColor: '#ff8a8033', fill: true, yAxisID: 'y' }, { label: 'Volume Totale', data: totalVolumeData, borderColor: '#80d8ff', yAxisID: 'y1' }] },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#aabac7' } }, tooltip: { titleColor: '#ffffff', bodyColor: '#aabac7', backgroundColor: '#2b3a4a' } }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Kg', color: '#ffffff' }, ticks: { color: '#aabac7' }, grid: { color: '#334354' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Volume', color: '#ffffff' }, ticks: { color: '#aabac7' }, grid: { drawOnChartArea: false } }, x: { ticks: { color: '#aabac7' }, grid: { color: '#334354' } } } }
        });
    });

    // ---------- EVENT LISTENERS ----------
    document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    workoutTypeSelect.addEventListener('change', () => loadExercises(workoutTypeSelect.value));
    document.getElementById('view-progress-btn').addEventListener('click', () => showView('progress-section'));
    document.getElementById('close-workout-btn').addEventListener('click', () => showView('calendar-container'));
    document.getElementById('close-progress-btn').addEventListener('click', () => showView('calendar-container'));
    document.getElementById('save-workout').addEventListener('click', () => showView('calendar-container'));
    mediaViewer.querySelector('.close-viewer').addEventListener('click', closeMediaViewer);
    mediaViewer.querySelector('.prev-arrow').addEventListener('click', () => { showMedia((currentMediaIndex - 1 + currentMedia.length) % currentMedia.length); });
    mediaViewer.querySelector('.next-arrow').addEventListener('click', () => { showMedia((currentMediaIndex + 1) % currentMedia.length); });
    exerciseList.addEventListener('click', (e) => {
        const mediaIcon = e.target.closest('.media-icon'); if (mediaIcon) { openMediaViewer(mediaIcon.dataset.exerciseName); return; }
        if (e.target.matches('.finish-exercise-btn')) { saveSingleExercise(e.target.closest('.exercise')); }
        const timerButton = e.target.closest('.timer-buttons button'); if (timerButton) { startTimer(parseInt(timerButton.dataset.duration), timerButton); }
    });
    exerciseList.addEventListener('focusin', (e) => {
        if (e.target.matches('input')) { const exerciseDiv = e.target.closest('.exercise'); if (exerciseDiv && !exerciseDiv.dataset.startTime) exerciseDiv.dataset.startTime = Date.now(); }
    });

    // ---------- INIZIALIZZAZIONE ----------
    renderCalendar(); updateProgressSection(); showView('calendar-container');
});
