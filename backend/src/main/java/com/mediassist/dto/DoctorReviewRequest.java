package com.mediassist.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DoctorReviewRequest {

    @NotNull(message = "Điểm đánh giá không được để trống")
    @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1 sao")
    @Max(value = 5, message = "Điểm đánh giá tối đa là 5 sao")
    private Integer rating;

    @Size(max = 1000, message = "Nội dung nhận xét tối đa 1000 ký tự")
    private String comment;

    @Size(max = 255, message = "Thẻ nhận xét tối đa 255 ký tự")
    private String tags;

    public DoctorReviewRequest() {}

    public DoctorReviewRequest(Integer rating, String comment, String tags) {
        this.rating = rating;
        this.comment = comment;
        this.tags = tags;
    }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
}
