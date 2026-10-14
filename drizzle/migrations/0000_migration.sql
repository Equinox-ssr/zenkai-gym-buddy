CREATE TABLE public.exercises (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.routines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.routine_exercises (routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE, position int NOT NULL DEFAULT 0, PRIMARY KEY (routine_id, exercise_id));
CREATE TABLE public.workouts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL, date timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.sets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE, weight numeric NOT NULL DEFAULT 0, reps int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises, public.routines, public.routine_exercises, public.workouts, public.sets TO authenticated;
GRANT ALL ON public.exercises, public.routines, public.routine_exercises, public.workouts, public.sets TO service_role;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own exercises" ON public.exercises FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own routines" ON public.routines FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own routine_exercises" ON public.routine_exercises FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.user_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.user_id = auth.uid()));
CREATE POLICY "own sets" ON public.sets FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.user_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.user_id = auth.uid()));
CREATE INDEX ON public.sets(workout_id); CREATE INDEX ON public.sets(exercise_id); CREATE INDEX ON public.workouts(user_id, date DESC);