// workout_plans.js

const workoutPlans = {
    push: [
        { 
            name: 'Panca piana', sets: 4, reps: '8-12', 
            media: [
                { type: 'video', src: 'media/panca_piana_video.mp4' },
                { type: 'image', src: 'media/panca_piana_setup.jpg' }
            ] 
        },
        { 
            name: 'Shoulder machine', sets: 3, reps: '8-12', 
            media: [
                { type: 'video', src: 'media/shoulder_press_video.mp4' }
            ] 
        },
        { name: 'Chest press vertical', sets: 3, reps: '8-12', media: [] },
        { name: 'Lateral raise machine', sets: 4, reps: '12-15', media: [] },
        { name: 'Peck deck', sets: 3, reps: '12-15', media: [] },
        { name: 'Triceps extension', sets: 3, reps: '8-12', media: [] },
        { name: 'Triceps pushdown', sets: 3, reps: '12-15', media: [] },
        { name: 'Crunch machine', sets: 4, reps: '10-12', media: [] }
    ],
    pull: [
        { 
            name: 'Lat machine', sets: 3, reps: '8-12', 
            media: [
                { type: 'video', src: 'media/lat_machine_video.mp4' },
                { type: 'image', src: 'media/lat_machine_schiena.jpg' }
            ]
        },
        { name: 'Trazioni', sets: 4, reps: '6-10', media: [] },
        { name: 'Rematore con bilanciere', sets: 3, reps: '8-12', media: [] },
        { name: 'Curl bicipiti', sets: 3, reps: '10-15', media: [] }
    ],
    legs: [
        { name: 'Squat', sets: 4, reps: '6-10', media: [] },
        { name: 'Leg press', sets: 3, reps: '8-12', media: [] },
        { name: 'Leg extension', sets: 3, reps: '12-15', media: [] },
        { name: 'Calf raises', sets: 4, reps: '15-20', media: [] }
    ]
};
