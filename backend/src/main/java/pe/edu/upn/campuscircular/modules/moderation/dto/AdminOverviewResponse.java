package pe.edu.upn.campuscircular.modules.moderation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminOverviewResponse(
    long totalUsers,
    long activeUsers,
    long suspendedUsers,
    long inactiveUsers,
    long totalPublications,
    long activePublications,
    long inNegotiationPublications,
    long suspendedPublications,
    long retiredPublications,
    long transferredPublications,
    long pendingReports,
    long resolvedReports,
    long totalReports,
    long completedTransactions,
    long activeTransactions,
    List<AdminActivityItem> recentActivity
) {
    public record AdminActivityItem(
        String id,
        String type,
        String action,
        String actor,
        String targetLabel,
        String description,
        LocalDateTime createdAt
    ) {}
}
