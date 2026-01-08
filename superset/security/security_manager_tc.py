import logging
from flask import render_template_string, Response,request,session,redirect,make_response,current_app
from flask_login import logout_user
from flask_appbuilder.security.views import AuthDBView
from flask_appbuilder.baseviews import expose
from flask_appbuilder.security.sqla.models import User
from sqlalchemy import Column, String
from superset.security import SupersetSecurityManager
from pathlib import Path
from superset import db
import os


logger = logging.getLogger(__name__)



class CustomUser(User):
    __tablename__ = "ab_user"

    tc_company_id = Column(String(64), nullable=True)
    tc_user_id = Column(String(64), nullable=True, unique=True)



class CustomLoginView(AuthDBView):

    @expose("/timechamp-auth.js", methods=["GET"])
    def serve_js(self):
        logger.warning("Serving timechamp-auth.js from /dataanalytics")

        try:
            js_path = Path(__file__).parent / "timechamp-auth.js"
            content = js_path.read_text()
            return Response(content, mimetype="text/javascript")
        except Exception as e:
            logger.error(f"Error loading JS: {e}")
            return Response("console.error('Failed to load JS');", mimetype="text/javascript")


    @expose("/logout/", methods=["GET"])
    @expose("/logout", methods=["GET"])
    def logout(self):
        logger.info("Custom TimeChamp /logout called")

        logout_user()
        session.clear()

        prefix = os.getenv("SUPERSET_APP_ROOT", "").rstrip("/")

        html_template = f"""
        <html lang="en">
        <body>
            <script type="module" src="{prefix}/timechamp-auth.js"></script>
        </body>
        </html>
        """

        resp = make_response(render_template_string(html_template))

        resp.delete_cookie(
            current_app.config["SESSION_COOKIE_NAME"],

            path=prefix or "/"
        )

        resp.headers["Cache-Control"] = "no-store"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"

        return resp
    
    @expose("/tc-entry",methods=["GET"])
    @expose("/tc-entry/",methods=["GET"])
    def tc_entry(self):
        logger.info("tc entry api called")
        try:
            logout_user()
            session.clear()
            logger.info("Fab initial logout successfull")
        except Exception as e:
            logger.error("Fab initial logout failed")
        
        prefix = os.getenv("SUPERSET_APP_ROOT", "").rstrip("/")
        resp = make_response(redirect(f"{prefix}/login"))

        resp.delete_cookie(
            current_app.config["SESSION_COOKIE_NAME"],

            path=prefix or "/"
        )
        resp.headers["Cache-Control"] = "no-store"
        return resp


class TCSecurityManager(SupersetSecurityManager):
    user_model = CustomUser
    authdbview = CustomLoginView

    def find_user(self, username=None, email=None, tc_user_id=None):
        db_session = self.get_session()

        if tc_user_id:
            user = db_session.query(self.user_model).filter_by(tc_user_id=tc_user_id).first()
            if user:
                return user

        return super().find_user(username=username, email=email)

    def add_user(
        self,
        username,
        first_name,
        last_name,
        email,
        role,
        password="",
        tc_user_id=None,
        tc_company_id=None,
    ):
        user = self.user_model(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            tc_user_id=tc_user_id,
            tc_company_id=tc_company_id,
        )

        user.roles = [role]

        db_session = self.get_session()
        db_session.add(user)
        db_session.commit()

        return user
    
    def get_session(self):
        return db.session
    

    def sync_role_definitions(self):
        super().sync_role_definitions()

        alpha = self.find_role("Alpha")
        if not alpha:
            return

        manage_pv = self.find_permission_view_menu("can_access", "Manage")

        if manage_pv and manage_pv in alpha.permissions:
            self.remove_permission_role(alpha, manage_pv)
            logger.info("Removed Manage menu access from Alpha role")


    def __init__(self, appbuilder):
        super().__init__(appbuilder)
        logging.info("Custom Security Manager Initialized with FAB views")


       


