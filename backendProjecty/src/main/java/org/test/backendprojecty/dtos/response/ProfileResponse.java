package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private int builderNumber;
    private String mission;
    private boolean openToChat;
    private boolean ownProfile;
    private ProfileStatsResponse stats;
    private List<WeeklyCadenceResponse> shippingCadence;
    private List<ProjectBreakdownResponse> whereWorkGoes;
    private List<ShippedItemResponse> recentlyShipped;
    private ProfileCircleResponse circle;
}
