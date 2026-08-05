package org.test.backendprojecty.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public TaskScheduler focusRoomTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("focus-room-scheduler-");
        scheduler.initialize();
        return scheduler;
    }

    // Named "taskScheduler" so Spring's @EnableScheduling cron infrastructure (e.g.
    // TaskReminderSchedulerService) picks this one up unambiguously, instead of
    // falling back to a default scheduler because two other TaskScheduler beans
    // (this one and STOMP's messageBrokerTaskScheduler) already exist.
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("cron-scheduler-");
        scheduler.initialize();
        return scheduler;
    }
}
