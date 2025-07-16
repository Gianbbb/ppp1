document.addEventListener('DOMContentLoaded', () => {
    // ---------- ELEMENTI DEL DOM ----------
    const allViews = ['calendar-container', 'workout-section', 'progress-section'];
    const calendarContainer = document.getElementById('calendar-container');
    const workoutSection = document.getElementById('workout-section');
    const progressSection = document.getElementById('progress-section');

    const monthYearElement = document.getElementById('month-year');
    const calendarElement = document.getElementById('calendar');
    const workoutDateElement = document.getElementById('workout-date');
    const workoutTypeSelect = document.getElementById('workout-type-select');
    const exerciseList = document.getElementById('exercise-list');
    const progressSelect = document.getElementById('exercise-progress-select');
    const progressChartCanvas = document.getElementById('progress-chart').getContext('2d');

    // Pulsanti di navigazione
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const viewProgressBtn = document.getElementById('view-progress-btn');
    const closeWorkoutBtn = document.getElementById('close-workout-btn');
    const closeProgressBtn = document.getElementById('close-progress-btn');
    const saveWorkoutButton = document.getElementById('save-workout');

    let currentDate = new Date();
    let selectedDate = null;
    let chart = null;

    // ---------- GESTIONE VISTE ----------
    const showView = (viewId) => {
        allViews.forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');
    };

    // ---------- DEFINIZIONE SCHEDE E GESTIONE DATI ----------
    const workoutPlans = {
        push: [{ name: 'Panca piana', sets: 4, reps: '8-12' }, { name: 'Shoulder machine', sets: 3, reps: '8-12' }, { name: 'Chest press vertical', sets: 3, reps: '8-12' }, { name: 'Lateral raise machine', sets: 4, reps: '12-15' }, { name: 'Peck deck', sets: 3, reps: '12-15' }, { name: 'Triceps extension', sets: 3, reps: '8-12' }, { name: 'Triceps pushdown', sets: 3, reps: '12-15' }, { name: 'Crunch machine', sets: 4, reps: '10-12' }],
        pull: [{ name: 'Trazioni', sets: 4, reps: '6-10' }, { name: 'Lat machine', sets: 3, reps: '8-12' }],
        legs: [{ name: 'Squat', sets: 4, reps: '6-10' }, { name: 'Leg press', sets: 3, reps: '8-12' }]
    };
    const getSavedData = () => JSON.parse(localStorage.getItem('gymTrackerData')) || {};
    const saveData = (data) => localStorage.setItem('gymTrackerData', JSON.stringify(data));

    // ---------- LOGICA CALENDARIO ----------
    const renderCalendar = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        monthYearElement.textContent = `${currentDate.toLocaleString('it-IT', { month: 'long' })} ${year}`;
        calendarElement.innerHTML = '';
        const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        weekDays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.textContent = day;
            dayElement.classList.add('weekday');
            calendarElement.appendChild(dayElement);
        });
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) { calendarElement.appendChild(document.createElement('div')); }
        const savedData = getSavedData();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = i;
            dayElement.classList.add('day');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dayElement.dataset.date = dateStr;
            if (savedData[dateStr]) { dayElement.classList.add(savedData[dateStr].type); }
            dayElement.addEventListener('click', () => openWorkoutForDate(dateStr));
            calendarElement.appendChild(dayElement);
        }
    };

    // ---------- LOGICA ALLENAMENTO ----------
    const openWorkoutForDate = (dateStr) => {
        selectedDate = dateStr;
        const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        workoutDateElement.textContent = formattedDate;
        exerciseList.innerHTML = '';
        workoutTypeSelect.value = '';
        const savedData = getSavedData();
        if (savedData[selectedDate]) {
            workoutTypeSelect.value = savedData[selectedDate].type;
            loadExercises(savedData[selectedDate].type, savedData[selectedDate].exercises);
        }
        showView('workout-section');
    };

    const loadExercises = (type, savedExercises = []) => {
        const plan = workoutPlans[type];
        exerciseList.innerHTML = '';
        if (!plan) return;
        const allData = getSavedData();
        plan.forEach((exercise) => {
            const exerciseData = savedExercises.find(e => e.name === exercise.name) || {};
            const lastWorkoutData = findLastExerciseData(allData, exercise.name);
            const exerciseDiv = document.createElement('div');
            exerciseDiv.className = 'exercise';
            exerciseDiv.innerHTML = `
                <div class="exercise-header"><span>${exercise.name} (${exercise.sets}x${exercise.reps})</span></div>
                <div class="sets-container"></div>
                <textarea class="notes" placeholder="Note veloci...">${exerciseData.notes || ''}</textarea>`;
            const setsContainer = exerciseDiv.querySelector('.sets-container');
            for (let i = 0; i < exercise.sets; i++) {
                const setData = exerciseData.series ? (exerciseData.series[i] || {}) : {};
                const lastSetData = lastWorkoutData.series ? (lastWorkoutData.series[i] || {}) : {};
                const setDiv = document.createElement('div');
                setDiv.className = 'set';
                setDiv.innerHTML = `
                    <span>Serie ${i + 1}</span>
                    <input type="number" class="weight" placeholder="kg" value="${setData.weight || ''}">
                    <input type="number" class="reps-done" placeholder="reps" value="${setData.reps || ''}">
                    <input type="number" class="rir" placeholder="RIR" value="${setData.rir || ''}">
                    <small class="last-time">Last: ${lastSetData.weight || '–'}kg x ${lastSetData.reps || '–'} @RIR ${lastSetData.rir || '–'}</small>
                    <div class="timer-buttons">
                        <button data-duration="30">30s</button> <button data-duration="60">60s</button> <button data-duration="90">90s</button>
                    </div>`;
                setsContainer.appendChild(setDiv);
            }
            exerciseList.appendChild(exerciseDiv);
        });
    };
    
    const findLastExerciseData = (allData, exerciseName) => {
        const dates = Object.keys(allData).sort((a, b) => new Date(b) - new Date(a));
        for (const date of dates) {
            if (selectedDate && date >= selectedDate) continue;
            const workout = allData[date];
            const exercise = workout.exercises.find(e => e.name === exerciseName);
            if (exercise) return exercise;
        }
        return {};
    };

    // ---------- LOGICA SALVATAGGIO ----------
    saveWorkoutButton.addEventListener('click', () => {
        const type = workoutTypeSelect.value;
        if (!type || !selectedDate) return;
        const exercises = [];
        document.querySelectorAll('#workout-section .exercise').forEach(exerciseDiv => {
            const name = exerciseDiv.querySelector('.exercise-header span').textContent.split(' (')[0];
            const series = [];
            exerciseDiv.querySelectorAll('.set').forEach(setDiv => {
                const weight = setDiv.querySelector('.weight').value;
                const reps = setDiv.querySelector('.reps-done').value;
                const rir = setDiv.querySelector('.rir').value;
                if (weight && reps) { series.push({ weight: parseFloat(weight), reps: parseInt(reps), rir: parseInt(rir) }); }
            });
            const notes = exerciseDiv.querySelector('.notes').value;
            exercises.push({ name, series, notes });
        });
        const allData = getSavedData();
        allData[selectedDate] = { type, exercises };
        saveData(allData);
        renderCalendar();
        updateProgressSection();
        showView('calendar-container');
    });

    // ---------- LOGICA GRAFICI ----------
    const updateProgressSection = () => {
        const allData = getSavedData();
        const exerciseNames = [...new Set(Object.values(allData).flatMap(w => w.exercises.map(e => e.name)))];
        progressSelect.innerHTML = '<option value="">Seleziona Esercizio</option>';
        exerciseNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name; option.textContent = name;
            progressSelect.appendChild(option);
        });
    };

    progressSelect.addEventListener('change', () => {
        const exerciseName = progressSelect.value;
        if (chart) chart.destroy();
        if (!exerciseName) return;
        const allData = getSavedData();
        const labels = [], maxWeightData = [], totalVolumeData = [];
        Object.keys(allData).sort((a,b) => new Date(a) - new Date(b)).forEach(date => {
            const workout = allData[date];
            const exercise = workout.exercises.find(e => e.name === exerciseName);
            if (exercise && exercise.series.length > 0) {
                labels.push(new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {day: '2-digit', month: 'short'}));
                let maxWeight = 0, volume = 0;
                exercise.series.forEach(set => {
                    if (set.weight > maxWeight) maxWeight = set.weight;
                    volume += set.weight * set.reps;
                });
                maxWeightData.push(maxWeight); totalVolumeData.push(volume);
            }
        });
        chart = new Chart(progressChartCanvas, {
            type: 'line', data: { labels, datasets: [{ label: 'Carico Max (kg)', data: maxWeightData, borderColor: '#ff8a80', backgroundColor: '#ff8a8033', fill: true, yAxisID: 'y' }, { label: 'Volume Totale', data: totalVolumeData, borderColor: '#80d8ff', yAxisID: 'y1' }] },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#aabac7' } }, tooltip: { titleColor: '#ffffff', bodyColor: '#aabac7', backgroundColor: '#2b3a4a' } }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Kg', color: '#ffffff' }, ticks: { color: '#aabac7' }, grid: { color: '#334354' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Volume', color: '#ffffff' }, ticks: { color: '#aabac7' }, grid: { drawOnChartArea: false } }, x: { ticks: { color: '#aabac7' }, grid: { color: '#334354' } } } }
        });
    });

    // ---------- TIMER CON AUTO-AVANZAMENTO ----------
    let restTimerInterval;
    const startTimer = (duration, element) => {
        clearInterval(restTimerInterval);
        const currentSetDiv = element.closest('.set');
        
        let timer = duration;
        element.disabled = true;
        restTimerInterval = setInterval(() => {
            element.textContent = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;
            if (--timer < 0) {
                clearInterval(restTimerInterval);
                element.disabled = false;
                element.textContent = `${duration}s`;
                if (navigator.vibrate) navigator.vibrate(200);

                // Auto-avanzamento
                const nextSetDiv = currentSetDiv.nextElementSibling;
                if (nextSetDiv && nextSetDiv.classList.contains('set')) {
                    document.querySelectorAll('.set.focused').forEach(el => el.classList.remove('focused'));
                    nextSetDiv.classList.add('focused');
                    const nextWeightInput = nextSetDiv.querySelector('.weight');
                    nextWeightInput.focus();
                    nextWeightInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 1000);
    };

    // ---------- EVENT LISTENER GLOBALI ----------
    prevMonthButton.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthButton.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    workoutTypeSelect.addEventListener('change', () => loadExercises(workoutTypeSelect.value));
    
    // Listeners per navigazione tra viste
    viewProgressBtn.addEventListener('click', () => showView('progress-section'));
    closeWorkoutBtn.addEventListener('click', () => showView('calendar-container'));
    closeProgressBtn.addEventListener('click', () => showView('calendar-container'));

    // Delega degli eventi per i bottoni del timer
    exerciseList.addEventListener('click', (e) => {
        if (e.target.matches('.timer-buttons button')) {
            const duration = e.target.dataset.duration;
            startTimer(parseInt(duration), e.target);
        }
    });

    // ---------- INIZIALIZZAZIONE ----------
    renderCalendar();
    updateProgressSection();
    showView('calendar-container'); // Mostra la vista del calendario all'avvio
});
