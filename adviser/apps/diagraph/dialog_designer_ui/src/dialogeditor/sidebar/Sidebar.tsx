import Fuse from "fuse.js";
import React, { useCallback, useRef, useState } from "react";
import { FormControl, Offcanvas, Tab, Tabs } from "react-bootstrap";
import { useStoreState } from "../../store/store";
import { INode } from "../../types";
import LinkDisplay from "./LinkDisplay";
import SearchDisplay from "./SearchDisplay";
import { TagFilterOptions } from "./TagSelect";
import TableDisplay from "./TableDisplay";

export interface SidebarProps {
	onHide: () => void;
	nodes: INode[];
}

const Sidebar = (props: SidebarProps) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState([] as any);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const nodes = useStoreState((state) => state.nodes);

	const performSearch = useCallback(() => {
		const options = {threshold: 0.6, findAllMatches: true, includeScore: true, includeMatches: true, minMatchCharLength: 2, ignoreLocation: true, keys: ['data.raw_text']};
		const fuse = new Fuse(props.nodes, options);
		// Get Ids of hidden nodes and filter them out of the search results
		const hiddenNodeIds = nodes.filter(node => (node as any).isHidden).map(node => node.id);
		setSearchResults(fuse.search(searchTerm).filter(res => !hiddenNodeIds.includes(res.item.id)));
	}, [nodes, props.nodes, searchTerm]);

	return <Offcanvas show={true} placement='end' scroll={true} backdrop={false} onShow={searchInputRef.current?.focus()} onHide={props.onHide}>
		<Offcanvas.Header closeButton>
			<Offcanvas.Title>Search Menu</Offcanvas.Title>
		</Offcanvas.Header>
		<Offcanvas.Body>
		<Tabs defaultActiveKey="search" id="search-menu-tabs" className="mb-3">
			<Tab eventKey="search" title="Search">
				<FormControl
					autoFocus={true}
					ref={searchInputRef}
					type={"search"}
					className={"mr-2"}
					aria-label={"Enter Search Term"}
					placeholder={"Enter Search Term"}
					onChange={(e) => {setSearchTerm(e.target.value); performSearch();}}
				/>
				{ (searchResults.length > 0 && searchTerm.length > 2) && <SearchDisplay results={searchResults} previewLength={50}/> }
			</Tab>
			<Tab eventKey="links" title="Links">
				{<LinkDisplay/>}
			</Tab>
			<Tab eventKey="tags" title="Tags">
				{<TagFilterOptions/>}
			</Tab>
			<Tab eventKey="tables" title="Tables">
				{<TableDisplay/>}
			</Tab>
		</Tabs>
		</Offcanvas.Body>
	</Offcanvas>
}

export default Sidebar;