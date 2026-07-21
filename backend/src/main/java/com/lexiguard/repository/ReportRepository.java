package com.lexiguard.repository;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.Report;
import com.lexiguard.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    Optional<Report> findByDocument(Document document);
    Optional<Report> findByDocumentId(Long documentId);

    @Query("SELECT AVG(r.overallScore) FROM Report r WHERE r.document.user = :user")
    Double getAverageRiskScoreByUser(@Param("user") User user);

    @Query("SELECT AVG(r.overallScore) FROM Report r")
    Double getAverageRiskScore();

    long countByOverallScoreBetween(int min, int max);
}
