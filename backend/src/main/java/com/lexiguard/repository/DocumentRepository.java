package com.lexiguard.repository;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByUserOrderByUploadDateDesc(User user);
    Long countByUser(User user);
}
