from typing import Annotated, Optional

class UsersApi:
    def getUser(self, id: Annotated[Optional[StrictStr], "id"]):
        return {}
