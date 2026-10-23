ALTER TABLE "Course" ADD CONSTRAINT "Course_credits_range" CHECK ("credits" BETWEEN 1 AND 12);
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_capacity_range" CHECK ("capacity" BETWEEN 1 AND 500);
ALTER TABLE "CourseSection" ADD CONSTRAINT "CourseSection_capacity_range" CHECK ("capacity" BETWEEN 1 AND 500);
ALTER TABLE "CourseSection" ADD CONSTRAINT "CourseSection_schedule_valid" CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute");
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_date_range" CHECK ("startsAt" < "endsAt");
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_failures_nonnegative" CHECK ("failures" >= 0);
