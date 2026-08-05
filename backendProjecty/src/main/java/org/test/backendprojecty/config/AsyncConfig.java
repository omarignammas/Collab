package org.test.backendprojecty.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    // Isolates slow LLM network/generation work (focus-room reports, course
    // summaries, quizzes) from the app's other threads.
    @Bean(name = "aiExecutor")
    public Executor aiExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setThreadNamePrefix("ai-executor-");
        executor.initialize();
        return executor;
    }
}
