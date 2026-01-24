package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"therefore/internal/content"

	"github.com/labstack/echo/v5"
)

// mockStore implements content.ContentStore for testing.
type mockStore struct {
	posts map[string]*content.Post
	tags  []content.TagCount
}

func newMockStore() *mockStore {
	return &mockStore{
		posts: make(map[string]*content.Post),
	}
}

func (m *mockStore) GetPost(_ context.Context, slug string) (*content.Post, error) {
	post, ok := m.posts[slug]
	if !ok {
		return nil, content.ErrPostNotFound
	}
	return post, nil
}

func (m *mockStore) ListPosts(_ context.Context, opts content.ListOptions) ([]*content.Post, error) {
	var posts []*content.Post
	for _, post := range m.posts {
		if opts.Tag != "" {
			hasTag := false
			for _, t := range post.Meta.Tags {
				if t == opts.Tag {
					hasTag = true
					break
				}
			}
			if !hasTag {
				continue
			}
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func (m *mockStore) GetTags(_ context.Context) ([]content.TagCount, error) {
	return m.tags, nil
}

func (m *mockStore) GetPostAsset(_ context.Context, slug, filename string) ([]byte, error) {
	return nil, errors.New("not implemented")
}

func TestAPIHandler_GetPost(t *testing.T) {
	store := newMockStore()
	store.posts["test-post"] = &content.Post{
		Meta: content.PostMeta{
			Title:       "Test Post",
			Slug:        "test-post",
			Summary:     "A test post",
			PublishDate: time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
			Tags:        []string{"philosophy"},
		},
		HTMLContent: "<p>Content</p>",
	}

	handler := NewAPIHandler(store)
	e := echo.New()

	t.Run("found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/posts/test-post", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetPathValues(echo.PathValues{{Name: "slug", Value: "test-post"}})

		err := handler.GetPost(c)
		if err != nil {
			t.Fatalf("GetPost() error = %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Errorf("Status = %d, want %d", rec.Code, http.StatusOK)
		}

		var resp PostResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}
		if resp.Slug != "test-post" {
			t.Errorf("Slug = %q, want %q", resp.Slug, "test-post")
		}
		if resp.Title != "Test Post" {
			t.Errorf("Title = %q, want %q", resp.Title, "Test Post")
		}
		if resp.HTMLContent == "" {
			t.Error("HTMLContent should be included for single post")
		}
	})

	t.Run("not found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/posts/nonexistent", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetPathValues(echo.PathValues{{Name: "slug", Value: "nonexistent"}})

		err := handler.GetPost(c)
		if err == nil {
			t.Fatal("GetPost() expected error for nonexistent post")
		}
		var httpErr *echo.HTTPError
		if !errors.As(err, &httpErr) {
			t.Fatalf("Expected HTTPError, got %T", err)
		}
		if httpErr.Code != http.StatusNotFound {
			t.Errorf("HTTPError.Code = %d, want %d", httpErr.Code, http.StatusNotFound)
		}
	})
}

func TestAPIHandler_ListPosts(t *testing.T) {
	store := newMockStore()
	store.posts["post1"] = &content.Post{
		Meta: content.PostMeta{
			Title:       "Post 1",
			Slug:        "post1",
			PublishDate: time.Now(),
			Tags:        []string{"philosophy"},
		},
	}
	store.posts["post2"] = &content.Post{
		Meta: content.PostMeta{
			Title:       "Post 2",
			Slug:        "post2",
			PublishDate: time.Now(),
			Tags:        []string{"theology"},
		},
	}

	handler := NewAPIHandler(store)
	e := echo.New()

	t.Run("all posts", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/posts", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.ListPosts(c)
		if err != nil {
			t.Fatalf("ListPosts() error = %v", err)
		}

		var resp ListPostsResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}
		if resp.Total != 2 {
			t.Errorf("Total = %d, want 2", resp.Total)
		}
	})

	t.Run("filter by tag", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/posts?tag=philosophy", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.ListPosts(c)
		if err != nil {
			t.Fatalf("ListPosts() error = %v", err)
		}

		var resp ListPostsResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}
		if resp.Total != 1 {
			t.Errorf("Total = %d, want 1", resp.Total)
		}
	})
}

func TestAPIHandler_ListTags(t *testing.T) {
	store := newMockStore()
	store.tags = []content.TagCount{
		{Tag: "philosophy", Count: 5},
		{Tag: "theology", Count: 3},
	}

	handler := NewAPIHandler(store)
	e := echo.New()

	req := httptest.NewRequest(http.MethodGet, "/api/tags", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.ListTags(c)
	if err != nil {
		t.Fatalf("ListTags() error = %v", err)
	}

	var resp []TagResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	if len(resp) != 2 {
		t.Errorf("len(resp) = %d, want 2", len(resp))
	}
	if resp[0].Tag != "philosophy" || resp[0].Count != 5 {
		t.Errorf("resp[0] = %+v, want {Tag: philosophy, Count: 5}", resp[0])
	}
}
