from fastapi import APIRouter
auth_router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)
@auth_router.post("/register")
def register():
    pass

@auth_router.post("/login")
def login():
    pass

@auth_router.post("/logout")
def logout():
    pass

@auth_router.get("/me")
def get_me():
    pass