document.addEventListener('DOMContentLoaded', () => {
    // ---------- ELEMENTI DEL DOM ----------
    const allViews = ['calendar-container', 'workout-section', 'progress-section'];
    const workoutDateElement = document.getElementById('workout-date');
    const workoutTypeSelect = document.getElementById('workout-type-select');
    const exerciseList = document.getElementById('exercise-list');
    const progressSelect = document.getElementById('exercise-progress-select');
    const progressChartCanvas = document.getElementById('progress-chart').getContext('2d');
    
    let currentDate = new Date();
    let selectedDate = null;
    let chart = null;

    // ---------- GESTIONE VISTE ----------
    const showView = (viewId) => {
        allViews.forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
    };

    // ---------- GESTIONE DATI E DATI DI ESEMPIO ----------
    const getSavedData = () => JSON.parse(localStorage.getItem('gymTrackerData')) || {};
    const saveData = (data) => localStorage.setItem('gymTrackerData', JSON.stringify(data));

    const generateDummyData = () => {
        // Questa funzione viene eseguita solo una volta
        if (localStorage.getItem('dummyDataGenerated')) return;

        console.log("Generazione dati di esempio per la prima volta...");
        const allData = {};
        const dummyDate = new Date();
        dummyDate.setDate(dummyDate.getDate() - 3); // 3 giorni fa
        const dateStr = `${dummyDate.getFullYear()}-${String(dummyDate.getMonth() + 1).padStart(2, '0')}-${String(dummyDate.getDate()).padStart(2, '0')}`;
        
        const dummyExercises = workoutPlans.push.map(exercise => {
            const series = [];
            for (let i = 0; i < exercise.sets; i++) {
                series.push({
                    weight: Math.floor(Math.random() * 20 + 30), // Peso casuale tra 30 e 50
                    reps: Math.floor(Math.random() * 4 + 8),   // Reps casuali tra 8 e 12
                    rir: Math.floor(Math.random() * 2 + 1)      // RIR casuale tra 1 e 3
                });
            }
            return { name: exercise.name, series, notes: "Allenamento di prova." };
        });

        allData[dateStr] = { type: 'push', exercises: dummyExercises };
        saveData(allData);
        localStorage.setItem('dummyDataGenerated', 'true');
    };

    // ---------- LOGICA CALENDARIO ----------
    const renderCalendar = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        document.getElementById('month-year').textContent = `${currentDate.toLocaleString('it-IT', { month: 'long' })} ${year}`;
        const calendarElement = document.getElementById('calendar');
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

    // ---------- LOGICA ALLENAMENTO CON VIDEO ----------
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
        // workoutPlans è ora definito in workout_plans.js
        const plan = workoutPlans[type];
        exerciseList.innerHTML = '';
        if (!plan) return;
        const allData = getSavedData();
        plan.forEach((exercise) => {
            const exerciseData = savedExercises.find(e => e.name === exercise.name) || {};
            const lastWorkoutData = findLastExerciseData(allData, exercise.name);
            const exerciseDiv = document.createElement('div');
            exerciseDiv.className = 'exercise';
            
            // Aggiunta del link al video
            const videoLink = exercise.videoId
                ? `<a href="https://www.youtube.com/watch?v=${exercise.videoId}" target="_blank" class="video-link" title="Guarda il video dell'esercizio">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                   </a>`
                : '';

            exerciseDiv.innerHTML = `
                <div class="exercise-header">
                    <span>${exercise.name} (${exercise.sets}x${exercise.reps})</span>
                    ${videoLink}
                </div>
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

    // ... (Il resto dello script da "LOGICA SALVATAGGIO" in poi rimane identico al precedente)
    // ... (Assicurati di copiare anche le sezioni LOGICA SALVATAGGIO, LOGICA GRAFICI, TIMER, EVENT LISTENER e INIZIALIZZAZIONE dalla risposta precedente)
    
    // ---------- LOGICA SALVATAGGIO ----------
    document.getElementById('save-workout').addEventListener('click', () => {
        const type = workoutTypeSelect.value; if (!type || !selectedDate) return;
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
        const allData = getSavedData(); allData[selectedDate] = { type, exercises };
        saveData(allData); renderCalendar(); updateProgressSection(); showView('calendar-container');
    });

    // ---------- LOGICA GRAFICI ----------
    const updateProgressSection = () => {
        const allData = getSavedData();
        const exerciseNames = [...new Set(Object.values(allData).flatMap(w => w.exercises.map(e => e.name)))];
        progressSelect.innerHTML = '<option value="">Seleziona Esercizio</option>';
        exerciseNames.forEach(name => {
            const option = document.createElement('option'); option.value = name; option.textContent = name; progressSelect.appendChild(option);
        });
    };
    progressSelect.addEventListener('change', () => {
        const exerciseName = progressSelect.value; if (chart) chart.destroy(); if (!exerciseName) return;
        const allData = getSavedData(); const labels = [], maxWeightData = [], totalVolumeData = [];
        Object.keys(allData).sort((a,b) => new Date(a) - new Date(b)).forEach(date => {
            const workout = allData[date]; const exercise = workout.exercises.find(e => e.name === exerciseName);
            if (exercise && exercise.series.length > 0) {
                labels.push(new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {day: '2-digit', month: 'short'}));
                let maxWeight = 0, volume = 0;
                exercise.series.forEach(set => {
                    if (set.weight > maxWeight) maxWeight = set.weight; volume += set.weight * set.reps;
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

    // ---------- EVENT LISTENER GLOBALI ----------
    document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    workoutTypeSelect.addEventListener('change', () => loadExercises(workoutTypeSelect.value));
    document.getElementById('view-progress-btn').addEventListener('click', () => showView('progress-section'));
    document.getElementById('close-workout-btn').addEventListener('click', () => showView('calendar-container'));
    document.getElementById('close-progress-btn').addEventListener('click', () => showView('calendar-container'));
    exerciseList.addEventListener('click', (e) => {
        const timerButton = e.target.closest('.timer-buttons button');
        if (timerButton) {
            const duration = timerButton.dataset.duration;
            startTimer(parseInt(duration), timerButton);
        }
    });

    // ---------- INIZIALIZZAZIONE ----------
    generateDummyData(); // Genera i dati di esempio se necessario
    renderCalendar();
    updateProgressSection();
    showView('calendar-container');
});
