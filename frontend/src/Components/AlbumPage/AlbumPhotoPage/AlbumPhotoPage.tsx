import React, { ChangeEvent, RefObject, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import MenuIcon from "@material-ui/icons/Menu";
import { CssBaseline, AppBar, Toolbar, IconButton, createStyles, Theme, Typography } from "@material-ui/core";
import TopBar from "./TopBar";
import { Route, Switch, useHistory } from "react-router-dom";
import ViewPage from "../../ViewPage/ViewPage";
import axios from "axios";
import AddToAlbum from "../../Shared/AddToAlbum";
import qs from "qs";
import { PhotoT, AlbumT } from "../../../Interfaces";
import AbstractPhotoPage from "../../Shared/AbstractPhotoPage";
import { addPhotos, addPhotosToAlbums, deletePhotos, download, removePhotosFromAlbum, setCover } from "../../../API";
import TopRightBar from "./TopRightBar";
import AutoSizer from "react-virtualized-auto-sizer";
import SearchBar from "material-ui-search-bar";

const drawerWidth = 240;
const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            display: "flex",
        },
        drawer: {
            [theme.breakpoints.up("sm")]: {
                width: drawerWidth,
                flexShrink: 0,
            },
        },
        onlyMobile: {
            [theme.breakpoints.up("md")]: {
                display: "none",
            },
        },
        appBar: {
            background: "white",
            [theme.breakpoints.up("sm")]: {
                width: `calc(100% - ${drawerWidth}px)`,
                marginLeft: drawerWidth,
            },
        },
        menuButton: {
            color: theme.palette.primary.main,
            marginRight: theme.spacing(2),
            [theme.breakpoints.up("sm")]: {
                display: "none",
            },
        },
        // necessary for content to be below app bar
        toolbar: {
            ...theme.mixins.toolbar,
            height: 64,
        },
        drawerPaper: {
            width: drawerWidth,
        },
        topleft: {
            color: "#666666",
            fontSize: "xx-large",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            height: 64,
        },
        content: {
            flexGrow: 1,
            paddingLeft: 12,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
        },
    })
);

export default function AlbumPhotoPage(props: { handleDrawerToggle: () => void; drawerElement: any; refresh: () => Promise<void> }) {
    //#region Hooks
    const classes = useStyles();
    const hiddenFileInput: RefObject<HTMLInputElement> = React.useRef(null);

    const history = useHistory();
    const id = window.location.pathname.split("/")[3];

    const [photos, setPhotos] = useState<PhotoT[]>([]);
    const [albums, setAlbums] = useState<AlbumT[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [selectable, setSelectable] = useState(false);
    const [open, setOpen] = useState(false);
    const [showLoadingBar, setShowLoadingBar] = useState(true);
    const [viewId, setViewId] = useState("");

    const [showSearchBar, setShowSearchBar] = useState(false);
    const [searchBarText, setSearchBarText] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const url = searchTerm === "" ? `albums/${id}/all` : `albums/${id}/search/${searchTerm}`;

    const fetchPhotos = async () => {
        setShowLoadingBar(true);
        const resp = await axios.get(url);
        if (resp.status === 200) {
            setPhotos(resp.data);
            setShowLoadingBar(false);
        } else {
            window.alert(await resp.data);
        }
    };

    const fetchAlbums = async () => {
        const resp = await axios.get("albums/all");
        if (resp.status === 200) {
            setAlbums(resp.data);
        } else {
            window.alert(await resp.data);
        }
    };

    useEffect(() => {
        fetchPhotos();
        fetchAlbums();
    }, [url]);
    //#endregion hooks

    //#region API

    const cb = async (albumIds: string[]) => {
        await addPhotosToAlbums(selected, albumIds);
        await props.refresh();
        topBarButtonFunctions.unselect();
    };

    const deletePhoto = async (pid: string) => {
        await deletePhotos([pid]);
    };

    const removePhoto = async (pid: string) => {
        await removePhotosFromAlbum([pid], id);
    };

    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            const formData = new FormData();
            [...event.target.files].forEach((f) => {
                formData.append("file", f);
            });
            event.target.value = "";
            const data = await addPhotos(formData);

            await addPhotosToAlbums(data, [id]);
            await fetchPhotos();
            await props.refresh();
        } catch (error) {
            if (error.response) {
                window.alert(error.response.data);
            }
        }
    };
    //#endregion API

    //#region handlers

    const imageClickHandler = (photoId: string) => () => {
        if (anySelected()) {
            clickHandler(photoId)();
        } else {
            history.push(`/albums/open/${id}/view/${photoId}`);
        }
    };

    const clickHandler = (id: string) => () => {
        let copy = selected.slice();
        if (copy.includes(id)) copy = copy.filter((v) => v !== id);
        else copy.push(id);
        setSelected(copy);
        if (copy.length === 0) {
            setSelectable(false);
        }
    };

    const anySelected = (): boolean => {
        return selected.length !== 0 || selectable;
    };

    const viewButtonFunctions = {
        delete: async (id: string) => {
            await deletePhoto(id);
            await fetchPhotos();
            await props.refresh();
        },
        remove: async (id: string) => {
            await removePhoto(id);
            await fetchPhotos();
            await props.refresh();
        },
        addToAlbum: (id: string) => {
            setSelected([id]);
            setOpen(true);
        },
        setCover: async (photoID: string) => {
            await setCover(id, photoID);
            await props.refresh();
        },
        download: async (id: string) => {
            await download(photos.filter((photo) => id === photo.id));
        },
    };

    const topBarButtonFunctions = {
        setCover: async () => {
            await setCover(id, selected[0]);
            topBarButtonFunctions.unselect();
            await props.refresh();
        },
        delete: async () => {
            await deletePhotos(selected);

            topBarButtonFunctions.unselect();
            await fetchPhotos();
            await props.refresh();
        },
        remove: async () => {
            await removePhotosFromAlbum(selected, id);

            topBarButtonFunctions.unselect();
            await fetchPhotos();
            await props.refresh();
        },
        unselect: () => {
            setSelected([]);
            setSelectable(false);
        },
        upload: () => {
            if (!hiddenFileInput || !hiddenFileInput.current) {
                console.log("hiddenFileInput is null");
            } else {
                hiddenFileInput.current.click();
            }
        },
        settings: () => {
            //Nav to settings page
        },
        select: () => {
            setSelectable(!selectable);
        },
        addToAlbum: () => {
            setOpen(true);
        },
        download: async () => {
            await download(photos.filter((photo) => selected.includes(photo.id)));
            topBarButtonFunctions.unselect();
        },
        search: (s: string) => async () => {
            setSearchTerm(s);
        },
        mobileSearch: () => {
            setShowSearchBar(!showSearchBar);
        },
    };

    //#endregion handlers

    const topRightBar = (id: string, buttonFunctions: any) => {
        return <TopRightBar id={id} buttonFunctions={buttonFunctions} />;
    };

    const lines = [
        <div> </div>,
        <Typography variant="h4" style={{ paddingTop: 10, paddingLeft: 5 }}>
            {(albums.find((album: AlbumT) => album.id.toString() === id) || { name: "" }).name}
        </Typography>,
        <Typography variant="h5" style={{ display: searchTerm === "" ? "none" : "block", paddingLeft: 5 }}>
            Search results for {searchTerm}:
        </Typography>,
    ];

    const heights = [12, 42, searchTerm === "" ? 0 : 28];

    return (
        <div>
            <Switch>
                <Route path="/albums/open/:albumID/view">
                    <ViewPage setViewId={setViewId} photos={photos} topRightBar={topRightBar} buttonFunctions={viewButtonFunctions}></ViewPage>
                </Route>
                <Route path="/">
                    <div className={classes.root}>
                        <input type="file" onChange={upload} ref={hiddenFileInput} style={{ display: "none" }} multiple={true} />
                        <CssBaseline />

                        <AppBar position="fixed" className={classes.appBar}>
                            <Toolbar>
                                <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={props.handleDrawerToggle} className={classes.menuButton}>
                                    <MenuIcon />
                                </IconButton>
                                <TopBar numSelected={() => selected.length} buttonFunctions={topBarButtonFunctions} show={showLoadingBar} />
                            </Toolbar>
                        </AppBar>

                        {props.drawerElement}

                        <main className={classes.content}>
                            <div className={classes.toolbar} />
                            {showSearchBar && (
                                <SearchBar
                                    onCancelSearch={async () => {
                                        setSearchBarText("");
                                        topBarButtonFunctions.search("")();
                                    }}
                                    style={{ marginLeft: -12, borderRadius: 0, alignSelf: "flex-top" }}
                                    className={classes.onlyMobile}
                                    value={searchBarText}
                                    onChange={(s) => setSearchBarText(s)}
                                    onRequestSearch={topBarButtonFunctions.search(searchBarText)}
                                />
                            )}
                            <div style={{ flexGrow: 1 }}>
                                <AutoSizer>
                                    {({ height, width }) => (
                                        <AbstractPhotoPage
                                            height={height - 1}
                                            width={width}
                                            photos={photos}
                                            clickHandler={clickHandler}
                                            selected={selected}
                                            anySelected={anySelected}
                                            imageClickHandler={imageClickHandler}
                                            lines={lines}
                                            heights={heights}
                                            viewId={viewId}
                                            setViewId={setViewId}
                                        />
                                    )}
                                </AutoSizer>
                            </div>
                        </main>
                    </div>
                </Route>
            </Switch>
            <AddToAlbum albums={albums} open={open} setOpen={setOpen} cb={cb}></AddToAlbum>
        </div>
    );
}
